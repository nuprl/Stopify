/**
 * This transformation converts all instances of `new` to a function
 * call. Note that the handler itself stil has a `new` expression to deal
 * with native constructors.
 */

import { NodePath, VisitNode } from 'babel-traverse';
import * as t from 'babel-types';
import { FlatnessMark } from '../common/helpers';

import { knowns } from './cannotCapture';

const newVisit: VisitNode<FlatnessMark<t.NewExpression>> =
  function (path: NodePath<FlatnessMark<t.NewExpression>>): void {
    if (path.node.mark === 'Flat') {
      return;
    }
    if (t.isIdentifier(path.node.callee) &&
      knowns.includes(path.node.callee.name)) {
      return;
    }
    const { callee, arguments: args } = path.node;
    if(t.isIdentifier(callee) && knowns.includes(callee.name)) {
      return;
    }
    path.replaceWith(t.callExpression(
      t.memberExpression(t.identifier('$__R'), t.identifier('handleNew')),
      [callee, ...args]));
  };

module.exports = function () {
  return {
    visitor: {
      NewExpression: newVisit,
    }
  }
}
