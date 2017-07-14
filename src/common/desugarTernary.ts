/**
 * Module to desugar ternary operators with calls in branches to assignments
 * to a locally declared variable.
 */

import {NodePath, Visitor} from 'babel-traverse';
import * as t from 'babel-types';

const ternaries : Visitor = {
  ConditionalExpression: function (path: NodePath<t.ConditionalExpression>): void {
    const { test, consequent, alternate } = path.node;
    const funId = path.scope.generateUidIdentifier('ternary_fun');
    path.replaceWith(t.callExpression(t.memberExpression(
      t.functionExpression(funId, [],
        t.blockStatement([
          t.ifStatement(test,
            t.returnStatement(consequent),
            t.returnStatement(alternate)),
        ])), t.identifier('call')), [t.thisExpression()]));
  }
}

module.exports = function() {
  return { visitor: ternaries };
};
