/**
 * Module to desugar early-escaping && and || operators.
 *
 * Early-escaping logical expressions are transformed into ternary expressions.
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';

// Object containing the visitor functions
const andOrVisitor : Visitor = {
  // No Logical Binary Expressions
  LogicalExpression: {
    exit(path: NodePath<t.LogicalExpression>): void {
      const node = path.node;
      const { left, operator, right } = node;

      const tmp = path.scope.generateUidIdentifier('t');
      const andOrId = path.scope.generateUidIdentifier('logical_fun');
      // NOTE(arjun): The result of an assignment is value of the right-hand size.
      const test = t.sequenceExpression([t.assignmentExpression('=', tmp, left), tmp]);
      const trueBranch = operator === '&&' ? right : tmp;
      const falseBranch = operator === '&&' ? tmp : right;

      path.replaceWith(t.callExpression(t.memberExpression(
        t.functionExpression(andOrId, [],
          t.blockStatement([
            t.variableDeclaration('let',
              [t.variableDeclarator(tmp)]),
            t.ifStatement(test,
              t.blockStatement([t.returnStatement(trueBranch)]),
              t.blockStatement([t.returnStatement(falseBranch)]))])),
        t.identifier('call')),
        [t.thisExpression()]));
    }
  }
}

module.exports = function() {
  return { visitor: andOrVisitor };
};
