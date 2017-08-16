import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';

import * as assert from 'assert';

import { letExpression } from '../common/helpers';

type FunctionT = t.FunctionExpression | t.FunctionDeclaration;
type Labeled<T> = T & {
  labels?: number[];
  __usesArgs__?: boolean
}
type CaptureFun = (path: NodePath<t.AssignmentExpression>) => void;

export type CaptureLogic = 'lazy' | 'eager' | 'retval';

interface State {
  opts: {
    captureMethod: CaptureLogic,
  };
}

const captureLogics: { [key: string]: CaptureFun } = {
  lazy: lazyCaptureLogic,
  eager: eagerCaptureLogic,
  retval: retvalCaptureLogic,
};

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
const types = t.identifier('$__T');
const matArgs = t.identifier('materializedArguments');
const runtimeModeKind = t.memberExpression(runtime, t.identifier('mode'));
const runtimeStack = t.memberExpression(runtime, t.identifier('stack'));
const eagerStack = t.memberExpression(runtime, t.identifier('eagerStack'));
const topOfRuntimeStack = t.memberExpression(runtimeStack,
  t.binaryExpression("-", t.memberExpression(runtimeStack, t.identifier("length")), t.numericLiteral(1)), true);
const popRuntimeStack = t.callExpression(t.memberExpression(runtimeStack,
  t.identifier('pop')), []);
const pushRuntimeStack = t.memberExpression(runtimeStack, t.identifier('push'));
const pushEagerStack = t.memberExpression(eagerStack, t.identifier('unshift'));
const shiftEagerStack = t.memberExpression(eagerStack, t.identifier('shift'));
const normalMode = t.stringLiteral('normal');
const restoringMode = t.stringLiteral('restoring');
const captureExn = t.memberExpression(types, t.identifier('Capture'));
const restoreExn = t.memberExpression(types, t.identifier('Restore'));

const isNormalMode = t.binaryExpression('===', runtimeModeKind, normalMode);
const isRestoringMode = t.binaryExpression('===', runtimeModeKind, restoringMode);

const stackFrameCall = t.callExpression(t.memberExpression(topOfRuntimeStack,
  t.identifier('f')), []);

function isFlat(path: NodePath<t.Node>): boolean {
  return (<any>path.getFunctionParent().node).mark === 'Flat';
}

function usesArguments(path: NodePath<t.Function>) {
  let r = false;
  const visitor = {
    ReferencedIdentifier(path: NodePath<t.Identifier>) {
      if (path.node.name === 'arguments') {
        r = true;
        path.stop();
      }
    },
    Function(path: NodePath<t.Function>) {
      path.skip();
    }
  };
  path.traverse(visitor);
  return r;
}


function func(path: NodePath<Labeled<FunctionT>>): void {
  if ((<any>path.node).mark === 'Flat') {
    return;
  }
  const { body } = path.node;
  const afterDecls = body.body.findIndex(e =>
   !(<any>e).__boxVarsInit__ && !(<any>e).lifted);
  const { pre, post } = split(body.body, afterDecls);

  const locals = path.scope.generateUidIdentifier('locals');

  const restoreLocals: t.ExpressionStatement[] = [];
  let i = 0;

  function restore1(x: t.LVal): void {
    restoreLocals.push(
      t.expressionStatement(
        t.assignmentExpression(
          '=', x, t.memberExpression(locals, t.numericLiteral(i++), true))));
  }


  // Flatten list of assignments restoring local variables
  pre.forEach(decls => {
    if (t.isVariableDeclaration(decls)) {
      decls.declarations.forEach(x => restore1(x.id))
    }
  });

  for (const x of Object.keys(path.scope.bindings)) {
    // Type definition is missing this case.
    if (<string>(path.scope.getBinding(x)!.kind) !== 'hoisted') {
      continue;
    }
    restore1(path.scope.getBinding(x)!.identifier);
  }

  const restoreBlock = t.blockStatement([
    letExpression(locals,
      t.memberExpression(topOfRuntimeStack, t.identifier('locals')), 'const'),
    ...restoreLocals,
    t.expressionStatement(t.assignmentExpression('=', target,
      t.memberExpression(topOfRuntimeStack, t.identifier('index')))),
    t.expressionStatement(popRuntimeStack)
  ]);
  const ifRestoring = t.ifStatement(isRestoringMode, restoreBlock);

  const mayMatArgs: t.Statement[] = [];
  if (path.node.__usesArgs__) {
    mayMatArgs.push(
      t.variableDeclaration('const',
        [t.variableDeclarator(matArgs, t.identifier('arguments'))]));
  }

  const declTarget = letExpression(target, t.nullLiteral());
  (<any>declTarget).lifted = true;

  path.get('body').replaceWith(t.blockStatement([
    declTarget,
    ...pre,
    ifRestoring,
    ...mayMatArgs,
    ...post
  ]));
  path.skip();
};

function labelsIncludeTarget(labels: number[]): t.Expression {
  return labels.reduce((acc: t.Expression, lbl) =>
    t.logicalExpression('||', t.binaryExpression('===',
      target, t.numericLiteral(lbl)), acc), t.booleanLiteral(false));
}


function reapplyExpr(path: NodePath<Labeled<t.Function>>): t.Expression {
  const funId = path.node.id;
  if (path.node.__usesArgs__) {
    return t.callExpression(
      t.memberExpression(funId, t.identifier('apply')),
      [t.thisExpression(), matArgs]);
  }
  else {
    return t.callExpression(
      t.memberExpression(funId, t.identifier("call")),
      [t.thisExpression(), ...<any>path.node.params]);
  }
}

/**
 * Wrap callsites in try/catch block, lazily building the stack on catching a
 * Capture exception, then rethrowing.
 *
 *  jumper [[ x = f_n(...args) ]] =
 *    try {
 *      if (mode === 'normal') {
 *        x = f_n(...args);
 *      } else if (mode === restoring && target === n) {
 *        x = R.stack[R.stack.length-1].f();
 *      }
 *    } catch (exn) {
 *      if (exn instanceof Capture) {
 *        exn.stack.push(stackFrame);
 *      }
 *      throw exn;
 *    }
 */
function lazyCaptureLogic(path: NodePath<t.AssignmentExpression>): void {
  const applyLbl = t.numericLiteral(getLabels(path.node)[0]);
  const exn = path.scope.generateUidIdentifier('exn');

  const funParent = <NodePath<FunctionT>>path.findParent(p =>
    p.isFunctionExpression() || p.isFunctionDeclaration());
  const funId = funParent.node.id, funParams = funParent.node.params,
  funBody = funParent.node.body;

  const afterDecls = funBody.body.findIndex(e =>
    !(<any>e).__boxVarsInit__ && !(<any>e).lifted);
  const { pre, post } = split(funBody.body, afterDecls);

  const locals: t.LVal[] = [];
  pre.forEach(decls => {
    if (t.isVariableDeclaration(decls)) {
      decls.declarations.forEach(x => locals.push(x.id))
    }
  });
  for (const x of Object.keys(funParent.scope.bindings)) {
    // Type definition is missing this case.
    if (<string>(path.scope.getBinding(x)!.kind) !== 'hoisted') {
      continue;
    }
    locals.push(path.scope.getBinding(x)!.identifier);
  }

  const nodeStmt = t.expressionStatement(path.node);

  const restoreNode =
    t.assignmentExpression(path.node.operator,
      path.node.left, stackFrameCall)
  const ifStmt = t.ifStatement(
    isNormalMode,
    t.blockStatement([nodeStmt]),
    t.ifStatement(
      t.binaryExpression('===', target, applyLbl),
      t.expressionStatement(restoreNode)));

  const tryStmt = t.tryStatement(t.blockStatement([ifStmt]),
    t.catchClause(exn, t.blockStatement([
      t.ifStatement(t.binaryExpression('instanceof', exn, captureExn),
        t.blockStatement([
          t.expressionStatement(t.callExpression(t.memberExpression(t.memberExpression(exn, t.identifier('stack')), t.identifier('push')), [
            t.objectExpression([
              t.objectProperty(t.identifier('kind'), t.stringLiteral('rest')),
              t.objectProperty(
                t.identifier('f'),
                t.arrowFunctionExpression([], reapplyExpr(funParent))),
              t.objectProperty(t.identifier('locals'),
                t.arrayExpression(<any>locals)),
              t.objectProperty(t.identifier('index'), applyLbl),
            ]),
          ]))
        ])),
      t.throwStatement(exn)
    ])));

  const stmtParent = path.getStatementParent();
  stmtParent.replaceWith(tryStmt);
  stmtParent.skip();
}

/**
 * Eagerly build the stack, pushing frames before applications and popping on
 * their return. Capture exns are thrown straight to the runtime, passing the
 * eagerly built stack along with it.
 *
 *  jumper [[ x = f_n(...args) ]] =
 *    if (mode === 'normal') {
 *      eagerStack.unshift(stackFrame);
 *      x = f_n(...args);
 *      eagerStack.shift();
 *    } else if (mode === 'restoring' && target === n) {
 *      // Don't have to `unshift` to rebuild stack because the eagerStack is
 *      // preserved from when the Capture exn was thrown.
 *      x = R.stack[R.stack.length-1].f();
 *      eagerStack.shift();
 *    }
 */
function eagerCaptureLogic(path: NodePath<t.AssignmentExpression>): void {
  const applyLbl = t.numericLiteral(getLabels(path.node)[0]);

  const funParent = <NodePath<FunctionT>>path.findParent(p =>
    p.isFunctionExpression() || p.isFunctionDeclaration());
  const funId = funParent.node.id, funParams = funParent.node.params,
  funBody = funParent.node.body;

  const afterDecls = funBody.body.findIndex(e =>
    !(<any>e).__boxVarsInit__ && !(<any>e).lifted);
  const { pre, post } = split(funBody.body, afterDecls);

  const locals: t.LVal[] = [];
  pre.forEach(decls => {
    if (t.isVariableDeclaration(decls)) {
      decls.declarations.forEach(x => locals.push(x.id))
    }
  });
  for (const x of Object.keys(funParent.scope.bindings)) {
    // Type definition is missing this case.
    if (<string>(path.scope.getBinding(x)!.kind) !== 'hoisted') {
      continue;
    }
    locals.push(path.scope.getBinding(x)!.identifier);
  }

  const nodeStmt = t.expressionStatement(path.node);

  const stackFrame = t.objectExpression([
    t.objectProperty(t.identifier('kind'), t.stringLiteral('rest')),
    t.objectProperty(
      t.identifier('f'),
      t.arrowFunctionExpression([], reapplyExpr(funParent))),
    t.objectProperty(t.identifier('locals'),
      t.arrayExpression(<any>locals)),
    t.objectProperty(t.identifier('index'), applyLbl),
  ]);

  const restoreNode =
    t.assignmentExpression(path.node.operator,
      path.node.left, stackFrameCall)
  const ifStmt = t.ifStatement(
    isNormalMode,
    t.blockStatement([
      t.expressionStatement(t.callExpression(pushEagerStack, [
        stackFrame,
      ])),
      nodeStmt,
      t.expressionStatement(t.callExpression(shiftEagerStack, [])),
    ]),
    t.ifStatement(
      t.binaryExpression('===', target, applyLbl),
      t.blockStatement([
        t.expressionStatement(restoreNode),
        t.expressionStatement(t.callExpression(shiftEagerStack, [])),
      ])));
  (<any>ifStmt).isTransformed = true;

  const stmtParent = path.getStatementParent();
  stmtParent.replaceWith(ifStmt);
  stmtParent.skip();
}

/**
 * Special return-value to conditionally capture stack frames and propogate
 * returns up to the runtime.
 *
 *  jumper [[ x = f_n(...args) ]] =
 *    {
 *      let ret;
 *      if (mode === 'normal') {
 *        ret = f_n(...args);
 *      } else if (mode === 'restoring' && target === n) {
 *        ret = R.stack[R.stack.length-1].f();
 *      }
 *      if (ret instanceof Capture) {
 *        ret.stack.push(stackFrame);
 *        return ret;
 *      }
 *      if (mode === 'normal') x = ret;
 *    }
 */
function retvalCaptureLogic(path: NodePath<t.AssignmentExpression>): void {
  const applyLbl = t.numericLiteral(getLabels(path.node)[0]);
  const ret = path.scope.generateUidIdentifier('ret');

  const funParent = <NodePath<FunctionT>>path.findParent(p =>
    p.isFunctionExpression() || p.isFunctionDeclaration());
  const funId = funParent.node.id, funParams = funParent.node.params,
  funBody = funParent.node.body;

  const afterDecls = funBody.body.findIndex(e =>
    !(<any>e).__boxVarsInit__ && !(<any>e).lifted);
  const { pre, post } = split(funBody.body, afterDecls);

  const locals: t.LVal[] = [];
  pre.forEach(decls => {
    if (t.isVariableDeclaration(decls)) {
      decls.declarations.forEach(x => locals.push(x.id))
    }
  });
  for (const x of Object.keys(funParent.scope.bindings)) {
    // Type definition is missing this case.
    if (<string>(path.scope.getBinding(x)!.kind) !== 'hoisted') {
      continue;
    }
    locals.push(path.scope.getBinding(x)!.identifier);
  }

  const stackFrame = t.objectExpression([
    t.objectProperty(t.identifier('kind'), t.stringLiteral('rest')),
    t.objectProperty(
      t.identifier('f'),
      t.arrowFunctionExpression([], reapplyExpr(funParent))),
    t.objectProperty(t.identifier('locals'),
      t.arrayExpression(<any>locals)),
    t.objectProperty(t.identifier('index'), applyLbl),
  ]);

  const restoreBlock: t.IfStatement =
  t.ifStatement(t.binaryExpression('instanceof', ret, captureExn),
    t.blockStatement([
      t.expressionStatement(t.callExpression(
        t.memberExpression(t.memberExpression(ret,
          t.identifier('stack')), t.identifier('push')), [
            stackFrame,
          ])),
      t.returnStatement(ret),
    ]),
    t.ifStatement(t.binaryExpression('instanceof', ret, restoreExn),
      t.returnStatement(ret)));

  const ifStmt = t.ifStatement(
    isNormalMode,
    t.expressionStatement(t.assignmentExpression('=', ret, path.node.right)),
    t.ifStatement(
      t.binaryExpression('===', target, applyLbl),
      t.expressionStatement(t.assignmentExpression('=',
        ret, stackFrameCall))));

  const reassign = t.ifStatement(isNormalMode,
    t.expressionStatement(t.assignmentExpression(
      path.node.operator,
      path.node.left, ret)));

  const replace = t.ifStatement(t.logicalExpression('||',
    isNormalMode, t.binaryExpression('===', target, applyLbl)),
    t.blockStatement([
      t.variableDeclaration('let', [t.variableDeclarator(ret)]),
      ifStmt,
      restoreBlock,
      reassign,
    ]));
  (<any>replace).isTransformed = true;

  const stmtParent = path.getStatementParent();
  stmtParent.replaceWith(replace);
  stmtParent.skip();
}

const jumper: Visitor = {
  BlockStatement: {
    enter(path: NodePath<t.BlockStatement>): void {
      const { body } = path.node;
      const afterDecls = body.findIndex(e =>
        !(<any>e).__boxVarsInit__ && !(<any>e).lifted);
      const { pre, post } = split(body, afterDecls);

      const labels = post.map(statement => {
        return { stmt: statement, lbls: getLabels(statement) }
      });
      const newBlock: t.Statement[] = [];
      let block: t.Statement[] = [];
      labels.forEach(o => {
        const { stmt, lbls } = o;
        if (lbls.length === 0 &&
          !t.isFunctionDeclaration(stmt) &&
          !t.isReturnStatement(stmt)) {
          block.push(stmt);
          return;
        } else if (block.length !== 0) {
          const b: t.Statement & { mark?: 'Flat' } = t.ifStatement(isNormalMode,
            t.blockStatement(block));
          b.mark = 'Flat';
          newBlock.push(b);
        }
        newBlock.push(stmt);
        block = [];
      });
      if (block.length !== 0) {
          const b: t.Statement & { mark?: 'Flat' } = t.ifStatement(isNormalMode,
            t.blockStatement(block));
          b.mark = 'Flat';
          newBlock.push(b);
      }
      path.node.body = [...pre, ...newBlock];
    }
  },

  UpdateExpression: {
    exit(path: NodePath<Labeled<t.UpdateExpression>>): void {
      if (isFlat(path)) {
        return;
      }
      path.replaceWith(t.ifStatement(isNormalMode, t.expressionStatement(path.node)));
      path.skip();
    }
  },

  AssignmentExpression: {
    exit(path: NodePath<Labeled<t.AssignmentExpression>>, s: State): void {
      if (isFlat(path)) {
        return;
      }
      if (!t.isCallExpression(path.node.right)) {
        const ifAssign = t.ifStatement(isNormalMode, t.expressionStatement(path.node));
        path.replaceWith(ifAssign);
        path.skip();
      } else {
        captureLogics[s.opts.captureMethod](path);
      }
    }
  },

  FunctionExpression: {
    enter(path: NodePath<Labeled<t.FunctionExpression>>) {
      path.node.__usesArgs__ = usesArguments(path);
    },
    exit(path: NodePath<Labeled<t.FunctionExpression>>): void {
      return func(path);
    }
  },

  FunctionDeclaration: {
    enter(path: NodePath<Labeled<t.FunctionDeclaration>>) {
      path.node.__usesArgs__ = usesArguments(path);
    },
    exit(path: NodePath<Labeled<t.FunctionDeclaration>>): void {
      return func(path);
    }
  },

  WhileStatement: {
    exit(path: NodePath<Labeled<t.WhileStatement>>): void {
      // These cannot appear in flat functions, so no check.

      const labels = getLabels(path.node);
      const test = labels.length === 0 ?
      t.logicalExpression('&&', isNormalMode, path.node.test) :
      t.logicalExpression('||',
        t.logicalExpression('&&',
          isRestoringMode, labelsIncludeTarget(labels)),
        t.logicalExpression('&&',
          isNormalMode, path.node.test));

      path.node.test = test;
    }
  },

  IfStatement: {
    exit(path: NodePath<Labeled<t.IfStatement>>): void {
      if ((<any>path.node).isTransformed || isFlat(path)) {
        return;
      }

      const { test, consequent, alternate } = path.node;

      const alternateLabels = getLabels(alternate);
      const alternateCond = alternateLabels.length === 0 ?  isNormalMode :
      t.logicalExpression('||', isNormalMode,
        t.logicalExpression('&&', isRestoringMode,
          labelsIncludeTarget(getLabels(alternate))));
      const newAlt = alternate === null ? alternate :
      t.ifStatement(alternateCond, alternate);

      const consequentLabels = getLabels(consequent);
      const consequentCond = consequentLabels.length === 0 ?
      t.logicalExpression('&&', isNormalMode, test) :
      t.logicalExpression('||', t.logicalExpression('&&', isNormalMode, test),
      t.logicalExpression('&&', isRestoringMode,
        labelsIncludeTarget(getLabels(consequent))));

      const newIf = t.ifStatement(consequentCond, consequent, newAlt);
      path.replaceWith(newIf);
      path.skip();
    },
  },

  ReturnStatement: {
    exit(path: NodePath<Labeled<t.ReturnStatement>>, s: State): void {
      if (!t.isCallExpression(path.node.argument)) {
        return;
      }

      const funParent = path.findParent(p => p.isFunction());

      if (t.isFunction(funParent)) {
        const labels = getLabels(path.node);
        const ifReturn = t.ifStatement(isNormalMode, path.node,
          labels.length === 0 ? undefined :
          t.ifStatement(t.logicalExpression('&&',
            isRestoringMode, labelsIncludeTarget(labels)),
            t.returnStatement(stackFrameCall)));
        path.replaceWith(ifReturn);
        path.skip();
      } else {
        throw new Error(`Unexpected 'return' parent of type ${typeof funParent}`);
      }
    }
  },

  CatchClause: {
    exit(path: NodePath<t.CatchClause>, s: State): void {
      if (isFlat(path) ||
        s.opts.captureMethod === 'retval') {
        return;
      }
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
