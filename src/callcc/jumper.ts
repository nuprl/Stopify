import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';

import * as assert from 'assert';

import { letExpression } from '../common/helpers';
import * as R from './runtime';

type FunctionT = t.FunctionExpression | t.FunctionDeclaration;

function split<T>(arr: T[], index: number): { pre: T[], post: T[] } {
  return {
    pre: arr.slice(0, index),
    post: arr.slice(index, arr.length),
  };
}

const target = t.identifier('target');
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
  const afterDecls = body.body.findIndex(e => !t.isVariableDeclaration(e));
  const { pre, post } = split(body.body, afterDecls);

  const locals = path.scope.generateUidIdentifier('locals');

  const restoreLocals: t.ExpressionStatement[] = [];
  // Flatten list of assignments restoring local variables
  pre.forEach(decls =>
    (<t.VariableDeclaration>decls).declarations.forEach((x, i) =>
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

  body.body = [
    letExpression(target, t.nullLiteral()),
    ...pre,
    ifRestoring,
    ...post
  ];
};

const jumper: Visitor = {
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
  return { visitor: jumper };
}
