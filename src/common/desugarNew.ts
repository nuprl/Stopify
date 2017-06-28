/**
 * This transformation converts all instances of `new` to a function
 * call. Note that the handler itself stil has a `new` expression to deal
 * with native constructors.
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import { letExpression, transformed, OptimizeMark, NewTag, newTag }
from './helpers';

const newFuncName: t.Identifier = t.identifier('$handleNew');
const knownsId: t.Identifier = t.identifier('$knownBuiltIns');

function makeIdList(ids: string[]): t.Identifier[] {
  return ids.map(id => t.identifier(id));
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
const knowns = letExpression(knownsId, t.arrayExpression(makeIdList(
  ['Object',
    'Function',
    'Boolean',
    'Symbol',
    'Error',
    'EvalError',
    //'InternalError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'TypeError',
    'URIError',
    'Number',
    'Math',
    'Date',
    'String',
    'RegExp',
    'Array',
    'Int8Array',
    'Uint8Array',
    'Uint8ClampedArray',
    'Int16Array',
    'Uint16Array',
    'Int32Array',
    'Uint32Array',
    'Float32Array',
    'Float64Array',
    'Map',
    'Set',
    'WeakMap',
    'WeakSet'])));

const constr: t.Identifier = t.identifier('constr');
const restArgs: t.RestElement = t.restElement(t.identifier('args'));
const spreadArgs: t.SpreadElement = t.spreadElement(t.identifier('args'));

const handleNewFunc = letExpression(newFuncName, t.functionExpression(
  newFuncName,
  [constr, restArgs],
  t.blockStatement([
    t.ifStatement(
      t.callExpression(t.memberExpression(knownsId, t.identifier('includes')),
        [constr]),
      t.blockStatement([t.returnStatement(newTag(t.newExpression(constr, [spreadArgs])))]),
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
  )));

const program: VisitNode<t.Program> = {
  exit(path: NodePath<t.Program>) {
    (<any>path).unshiftContainer('body', handleNewFunc);
    (<any>path).unshiftContainer('body', knowns);
  }
}

const newVisit: VisitNode<OptimizeMark<NewTag<t.NewExpression>>> =
  function (path: NodePath<OptimizeMark<NewTag<t.NewExpression>>>): void {
    if (path.node.OptimizeMark === 'Untransformed') {
      return;
    }
    if (path.node.new) {
      return;
    }
    const { callee, arguments: args } = path.node;
    path.replaceWith(t.callExpression(newFuncName, [callee, ...args]));
  };

module.exports = function () {
  return {
    visitor: {
      Program: program,
      NewExpression: newVisit,
    }
  }
}
