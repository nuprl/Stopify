/**
 * This transformation converts all instances of `new` to a function
 * call. Note that the handler itself stil has a `new` expression to deal
 * with native constructors.
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {
  letExpression, transformed, OptimizeMark, NewTag, newTag
} from '../common/helpers';

const knowns = ['Object',
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
  'WeakSet',
  '$GeneratorConstructor'
];

const newVisit: VisitNode<OptimizeMark<t.NewExpression>> =
  function (path: NodePath<OptimizeMark<t.NewExpression>>): void {
    if (path.node.OptimizeMark === 'Untransformed') {
      return;
    }
    const { callee, arguments: args } = path.node;
    if(t.isIdentifier(callee) && knowns.includes(callee.name)) {
      return;
    }
    path.replaceWith(t.callExpression(
      t.identifier('$handleNew'), [callee, ...args]));
  };

module.exports = function () {
  return {
    visitor: {
      NewExpression: newVisit,
    }
  }
}
