/**
 * This transformation converts all instances of `new` to a function
 * call. Note that the handler itself stil has a `new` expression to deal
 * with native constructors.
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import { letExpression, transformed, OptimizeMark } from './helpers';

const newFuncName: t.Identifier = t.identifier('$handleNew');
const knownsId: t.Identifier = t.identifier('$knownBuiltIns');

function makeIdList(ids: string[]): t.Identifier[] {
  return ids.map(id => t.identifier(id));
}

const knowns = letExpression(knownsId, t.arrayExpression(makeIdList(
  ['WeakMap',
    'Map',
    'Set',
    'WeakSet',
    'String',
    'Number',
    'Function',
    'Object',
    'Array',
    'Date',
    'RegExp',
    'Error'])));

const constr: t.Identifier = t.identifier('constr');
const restArgs: t.RestElement = t.restElement(t.identifier('args'));
const spreadArgs: t.SpreadElement = t.spreadElement(t.identifier('args'));

const handleNewFunc = t.functionDeclaration(
  newFuncName,
  [constr, restArgs],
  t.blockStatement([
    t.ifStatement(
      t.callExpression(t.memberExpression(knownsId, t.identifier('includes')),
        [constr]),
      t.blockStatement([t.returnStatement(t.newExpression(constr, [spreadArgs]))]),
      t.blockStatement([
        letExpression(t.identifier('a'),
          t.callExpression(t.memberExpression(t.identifier('Object'),
            t.identifier('create')),
          [t.memberExpression(constr, t.identifier('prototype'))])),
        t.expressionStatement(t.callExpression(t.memberExpression(constr,
          t.identifier('apply')), [t.identifier('a'), t.identifier('args')])),
        t.returnStatement(t.identifier('a'))
      ]),
  )]
));

const program: VisitNode<t.Program> = {
  exit(path: NodePath<t.Program>) {
    path.node.body.unshift(handleNewFunc);
    path.node.body.unshift(knowns);
  }
}

const newVisit: VisitNode<OptimizeMark<t.NewExpression>> =
  function (path: NodePath<OptimizeMark<t.NewExpression>>): void {
    if (path.node.OptimizeMark === 'Untransformed') {
      return;
    }
    const { callee, arguments: args } = path.node;
    path.replaceWith(t.callExpression(
      t.identifier('$handleNew'),
      [callee, ...args]
    ))
};

module.exports = function () {
  return {
    visitor: {
      Program: program,
      NewExpression: newVisit,
    }
  }
}
