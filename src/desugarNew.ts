/**
 * This transformation converts all instances of `new` to a function
 * call. Note that the handler itself stil has a `new` expression to deal
 * with native constructors.
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import { parse } from 'babylon';

const handleNewFunc = parse(`
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

// Function to handle native constructors properly.
const $handleNew = function (constr, ...args) {
  if($knownBuiltIns.includes(constr)) {
    // Don't transform this new
    return new constr(...args);
  } else {
    // This should be transformed.
    const a = Object.create(constr.prototype);
    constr.call(a, ...args)
    return a;
  }
}
`, [])

const program: VisitNode<t.Program> = {
  exit(path: NodePath<t.Program>) {
    path.node.body.unshift(...handleNewFunc.program.body)
  }
}

const newVisit: VisitNode<t.NewExpression> =
  function (path: NodePath<t.NewExpression>): void {
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
