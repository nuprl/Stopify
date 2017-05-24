/**
 * This transformation converts all instances of `new` to a function
 * call. Note that the handler itself stil has a `new` expression to deal
 * with native constructors.
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import { parseExpression } from 'babylon';
import { letExpression, transformed, Tag, OptimizeMark } from './helpers';

const handleNewFunc = letExpression(
  t.identifier('$handleNew'),
  transformed(parseExpression(`
    function (constr, ...args) {
      const $knownBuiltIns = [
        WeakMap,
        Map,
        Set,
        WeakSet,
        String,
        Number,
        Function,
        Object,
        Array,
        Date,
        RegExp,
        Error
      ]

      if($knownBuiltIns.includes(constr)) {
        // Don't transform this new
        return new constr(...args)
      } else {
        // This should be transformed.
        const a = Object.create(constr.prototype);
        constr.apply(a, args)
        return a;
      }
    }
`, [])))

const program: VisitNode<t.Program> = {
  exit(path: NodePath<t.Program>) {
    path.node.body.unshift(handleNewFunc)
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
