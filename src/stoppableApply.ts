/**
 * Plugin to transform function applications into `apply` calls and define
 * `apply` at the top-level as stoppable.
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import * as b from 'babylon';

const applyFunction = <t.Statement>b.parse(`
let iterations = 0;
let counter = iterations;
function apply(f, k, ...args) {
  if (counter-- === 0) {
    counter = iterations;
    window.setTimeout(_ => {
      if (window.stopped) {
        console.log('terminated execution');
      } else {
        return f(k, ...args);
      }
    }, 0);
  } else {
    return f(k, ...args);
  }
}
`);

const stopApplyVisitor : Visitor = {
    Program: {
        exit(path: NodePath<t.Program>): void {
            path.node.body.unshift(applyFunction);
        },
    },

    CallExpression: function (path: NodePath<t.CallExpression>): void {
        const applyId = t.identifier('apply');
        const applyArgs = [path.node.callee, ...path.node.arguments];
        const applyCall = t.callExpression(applyId, applyArgs);
        path.node.callee = applyId;
        path.node.arguments = applyArgs;
    }
}

module.exports = function (babel) {
    return { visitor: stopApplyVisitor };
};
