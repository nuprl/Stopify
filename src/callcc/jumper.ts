import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';

import * as assert from 'assert';

import { letExpression } from '../common/helpers';

type FunctionT = t.FunctionExpression | t.FunctionDeclaration;
type Labeled<T> = T & {
  labels?: number[];
}

function split<T>(arr: T[], index: number): { pre: T[], post: T[] } {
  return {
    pre: arr.slice(0, index),
    post: arr.slice(index, arr.length),
  };
}

function getLabels(node: Labeled<t.Node>): number[] {
  if (node === null) {
    return [];
  }
  return node.labels === undefined ?  [] : node.labels;
}

const target = t.identifier('target');
const runtime = t.identifier('$__R');
const runtimeMode = t.memberExpression(runtime, t.identifier('mode'));
const runtimeModeKind = t.memberExpression(runtimeMode, t.identifier('kind'));
const runtimeStack = t.memberExpression(runtimeMode, t.identifier('stack'));
const topOfRuntimeStack = t.memberExpression(runtimeStack,
  t.binaryExpression("-", t.memberExpression(runtimeStack, t.identifier("length")), t.numericLiteral(1)), true);
const popStack = t.callExpression(t.memberExpression(runtimeStack,
  t.identifier('pop')), []);
const pushStack = t.memberExpression(runtimeStack, t.identifier('push'));
const normalMode = t.stringLiteral('normal');
const restoringMode = t.stringLiteral('restoring');
const captureExn = t.memberExpression(runtime, t.identifier('Capture'));
const restoreExn = t.memberExpression(runtime, t.identifier('Restore'));

const isNormalMode = t.binaryExpression('===', runtimeModeKind, normalMode);
const isRestoringMode = t.binaryExpression('===', runtimeModeKind, restoringMode);

const stackFrameCall = t.callExpression(t.memberExpression(topOfRuntimeStack,
  t.identifier('f')), []);

const func = function (path: NodePath<Labeled<FunctionT>>): void {
  const { body } = path.node;
  const afterDecls = body.body.findIndex(e => !t.isVariableDeclaration(e));
  const { pre, post } = split(body.body, afterDecls);

  const locals = path.scope.generateUidIdentifier('locals');

  const restoreLocals: t.ExpressionStatement[] = [];
  // Flatten list of assignments restoring local variables
  pre.forEach((decls, i) =>
    (<t.VariableDeclaration>decls).declarations.forEach((x, j) =>
      restoreLocals.push(t.expressionStatement(t.assignmentExpression('=', x.id,
        t.memberExpression(locals, t.numericLiteral(i), true))))));
  const restoreBlock = t.blockStatement([
    letExpression(locals,
      t.memberExpression(topOfRuntimeStack, t.identifier('locals')), 'const'),
    ...restoreLocals,
    t.expressionStatement(t.assignmentExpression('=', target,
      t.memberExpression(topOfRuntimeStack, t.identifier('index')))),
    t.expressionStatement(popStack)
  ]);
  const ifRestoring = t.ifStatement(isRestoringMode, restoreBlock);

  path.get('body').replaceWith(t.blockStatement([
    letExpression(target, t.nullLiteral()),
    ...pre,
    ifRestoring,
    ...post
  ]));
  path.skip();
};

function labelsIncludeTarget(labels: number[]): t.Expression {
  return labels.reduce((acc: t.Expression, lbl) =>
    t.logicalExpression('||', t.binaryExpression('===',
      target, t.numericLiteral(lbl)), acc), t.booleanLiteral(false));
}

function addCaptureLogic(path: NodePath<t.Expression | t.Statement>, restoreCall: () => t.Statement): void {
  const applyLbl = t.numericLiteral(getLabels(path.node)[0]);
  const exn = t.identifier('exn');

  const funParent = <NodePath<FunctionT>>path.findParent(p =>
    p.isFunctionExpression() || p.isFunctionDeclaration());
  const funId = funParent.node.id, funParams = funParent.node.params,
  funBody = funParent.node.body;

  const afterDecls = funBody.body.findIndex(e => !t.isVariableDeclaration(e));
  const { pre, post } = split(funBody.body, afterDecls);

  const locals: t.LVal[] = [];
  pre.forEach(decls =>
    (<t.VariableDeclaration>decls).declarations.forEach(x =>
      locals.push(x.id)));

  const nodeStmt = t.isStatement(path.node) ?
  path.node :
  t.expressionStatement(path.node);

  const ifStmt = t.ifStatement(
    isNormalMode,
    t.blockStatement([nodeStmt]),
    t.blockStatement(
      [t.ifStatement(
        t.binaryExpression('===', target, applyLbl),
        t.blockStatement([restoreCall()]))]));

  const reapply = t.callExpression(t.memberExpression(funId, t.identifier("call")),
    [t.thisExpression(), ...(<any>funParams)]);
  const tryStmt = t.tryStatement(t.blockStatement([ifStmt]),
    t.catchClause(exn, t.blockStatement([
      t.ifStatement(t.binaryExpression('instanceof', exn, captureExn),
        t.blockStatement([
          t.expressionStatement(t.callExpression(t.memberExpression(t.memberExpression(exn, t.identifier('stack')), t.identifier('push')), [
            t.objectExpression([
              t.objectProperty(t.identifier('kind'), t.stringLiteral('rest')),
              t.objectProperty(
                t.identifier('f'),
                t.arrowFunctionExpression([], reapply)),
              t.objectProperty(t.identifier('locals'),
                t.arrayExpression(<any>locals)),
              t.objectProperty(t.identifier('index'), applyLbl),
            ]),
          ]))
        ])),
      t.throwStatement(exn)
    ])));

  const tryApply = t.callExpression(t.arrowFunctionExpression([],
    t.blockStatement([tryStmt])), []);
  path.getStatementParent().isExpressionStatement() ?
  (path.getStatementParent().replaceWith(tryStmt), path.getStatementParent().skip()) :
  (path.replaceWith(tryApply), path.skip());
}

const jumper: Visitor = {
  UpdateExpression: {
    exit(path: NodePath<t.UpdateExpression>): void {
      path.replaceWith(t.ifStatement(isNormalMode, t.expressionStatement(path.node)));
      path.skip();
    }
  },

  AssignmentExpression: {
    exit(path: NodePath<Labeled<t.AssignmentExpression>>): void {
      if (!t.isCallExpression(path.node.right)) {
        const ifAssign = t.ifStatement(isNormalMode, t.expressionStatement(path.node));
        path.replaceWith(ifAssign);
        path.skip();
      } else {
        addCaptureLogic(path, () =>
          t.expressionStatement(
            t.assignmentExpression(path.node.operator,
              path.node.left, stackFrameCall)));
      }
    }
  },

  FunctionExpression: {
    exit(path: NodePath<Labeled<t.FunctionExpression>>): void {
      if (path.scope.hasOwnBinding("target")) {
        path.scope.rename("target");
      }
      return func(path);
    }
  },

  FunctionDeclaration: {
    exit(path: NodePath<Labeled<t.FunctionDeclaration>>): void {
      if (path.scope.hasOwnBinding("target")) {
        path.scope.rename("target");
      }
      return func(path);
    }
  },

  WhileStatement: function (path: NodePath<Labeled<t.WhileStatement>>): void {
    path.node.test = t.logicalExpression('||',
      t.logicalExpression('&&',
        isRestoringMode, labelsIncludeTarget(getLabels(path.node))),
      t.logicalExpression('&&',
        isNormalMode, path.node.test));
  },

  IfStatement: {
    exit(path: NodePath<Labeled<t.IfStatement>>): void {
      const { test, consequent, alternate } = path.node;
      const newAlt = alternate === null ? alternate :
      t.ifStatement(t.logicalExpression('||',
        t.logicalExpression('&&',
          isRestoringMode, labelsIncludeTarget(getLabels(alternate))),
        isNormalMode),
        alternate);
      const newIf = t.ifStatement(t.logicalExpression('||',
        t.logicalExpression('&&',
          isRestoringMode, labelsIncludeTarget(getLabels(consequent))),
        t.logicalExpression('&&', isNormalMode, test)),
        consequent, newAlt);
      path.replaceWith(newIf);
      path.skip();
    },
  },

  ReturnStatement: function(path: NodePath<Labeled<t.ReturnStatement>>): void {
    if (!t.isCallExpression(path.node.argument)) {
      return;
    }

    const funOrTryParent = path.findParent(p => p.isFunction() || p.isTryStatement());

    if (t.isFunction(funOrTryParent)) {
      const ifReturn = t.ifStatement(isNormalMode,
        path.node, t.ifStatement(t.logicalExpression('&&',
          isRestoringMode, labelsIncludeTarget(getLabels(path.node))),
          t.returnStatement(stackFrameCall)));
      path.replaceWith(ifReturn);
      path.skip();
    } else if (t.isTryStatement(funOrTryParent)) {
      addCaptureLogic(path, () => t.returnStatement(stackFrameCall));
    } else {
      throw new Error(`Unexpected 'return' parent of type ${typeof funOrTryParent}`);
    }
  },

  ThrowStatement: function(path: NodePath<Labeled<t.ThrowStatement>>): void {
    if (!t.isCallExpression(path.node.argument)) {
      return;
    }

    const ifThrow = t.ifStatement(isNormalMode,
      path.node, t.ifStatement(t.logicalExpression('&&',
        isRestoringMode, labelsIncludeTarget(getLabels(path.node))),
        t.throwStatement(stackFrameCall)));
    path.replaceWith(ifThrow);
    path.skip();
  },

  CatchClause: {
    exit(path: NodePath<t.CatchClause>): void {
      const { param, body } = path.node;
      body.body.unshift(t.ifStatement(
        t.logicalExpression('||',
          t.binaryExpression('instanceof', param, captureExn),
          t.binaryExpression('instanceof', param, restoreExn)),
        t.throwStatement(param)));
      path.skip();
    }
  },

  Program: function (path: NodePath<t.Program>): void {
    path.node.body = [t.functionDeclaration(t.identifier('$program'),
      [], t.blockStatement(path.node.body))];
  }
};

module.exports = function () {
  return { visitor: jumper };
}
