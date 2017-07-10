import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';

import * as assert from 'assert';

import { letExpression } from '../common/helpers';
import * as R from './runtime';

type FunctionT = t.FunctionExpression | t.FunctionDeclaration;

const runtime = t.identifier('R');
const runtimeMode = t.memberExpression(runtime, t.identifier('mode'));
const runtimeModeKind = t.memberExpression(runtimeMode, t.identifier('kind'));
const runtimeStack = t.memberExpression(runtimeMode, t.identifier('stack'));
const topOfRuntimeStack = t.memberExpression(runtimeStack, t.numericLiteral(0), true);
const popStack = t.callExpression(t.memberExpression(runtimeStack,
  t.identifier('pop')), []);
const normalMode = t.stringLiteral('normal');
const restoringMode = t.stringLiteral('restoring');

const isNormalMode = t.binaryExpression('===', runtimeModeKind, normalMode);
const isRestoringMode = t.binaryExpression('===', runtimeModeKind, restoringMode);

const stackFrameCall = t.callExpression(t.memberExpression(topOfRuntimeStack,
  t.identifier('f')), []);

const func = function (path: NodePath<FunctionT>): void {
  const { body } = path.node;
  // First statement of function body is declaration of all locals.
  assert(t.isVariableDeclaration(body.body[0]));
  const [decls, ...rest] = body.body;
  const declsPath = path.get('body').get('body.0');

  const target = path.scope.generateUidIdentifier('target');
  const locals = path.scope.generateUidIdentifier('locals');

  (<t.VariableDeclaration>decls).declarations.push(t.variableDeclarator(target));

  const restoreBlock = t.blockStatement([
    letExpression(locals,
      t.memberExpression(topOfRuntimeStack, t.identifier('locals')), 'const'),
    // Flatten list of assignments restoring local variables
    ...((<t.VariableDeclaration>decls).declarations.map((x, i) =>
      t.expressionStatement(t.assignmentExpression('=', x.id,
        t.memberExpression(locals, t.numericLiteral(i), true))))),
    t.expressionStatement(t.assignmentExpression('=', target,
      t.memberExpression(topOfRuntimeStack, t.identifier('index')))),
    t.expressionStatement(popStack)
  ]);
  const ifRestoring = t.ifStatement(isRestoringMode, restoreBlock);

  body.body = [decls, ifRestoring, ...rest];
};

const callcc: Visitor = {
  AssignmentExpression: function (path: NodePath<t.AssignmentExpression>): void {
    if (!t.isCallExpression(path.node.right)) {
      const ifAssign = t.ifStatement(isNormalMode, t.expressionStatement(path.node));
      path.replaceWith(ifAssign);
      path.skip();
    }
  },

  FunctionExpression: {
    exit(path: NodePath<t.FunctionExpression>): void {
      return func(path);
    }
  },

  FunctionDeclaration: {
    exit(path: NodePath<t.FunctionDeclaration>): void {
      return func(path);
    }
  },

  WhileStatement: function (path: NodePath<t.WhileStatement>): void {
    path.node.test = t.logicalExpression('||',
      t.logicalExpression('&&', isRestoringMode, t.booleanLiteral(true)),
      t.logicalExpression('&&', isNormalMode, path.node.test));
  },

  IfStatement: {
    exit(path: NodePath<t.IfStatement>): void {
      const { test, consequent, alternate } = path.node;
      const newAlt = alternate === null ? alternate :
      t.ifStatement(t.logicalExpression('||',
        t.logicalExpression('&&', isRestoringMode, t.booleanLiteral(true)),
        isNormalMode),
        alternate);
      const newIf = t.ifStatement(t.logicalExpression('||',
        t.logicalExpression('&&', isRestoringMode, t.booleanLiteral(true)),
        t.logicalExpression('&&', isNormalMode, test)),
        consequent, newAlt);
      path.replaceWith(newIf);
      path.skip();
    },
  },

  ReturnStatement: {
    exit(path: NodePath<t.ReturnStatement>): void {
      if (!t.isCallExpression(path.node.argument)) {
        return;
      }

      const ifReturn = t.ifStatement(isNormalMode,
        path.node, t.ifStatement(t.logicalExpression('&&',
          isRestoringMode, t.booleanLiteral(true)),
          t.returnStatement(stackFrameCall)));
      path.replaceWith(ifReturn);
      path.skip();
    },
  }
};

module.exports = function () {
  return { visitor: callcc };
}
