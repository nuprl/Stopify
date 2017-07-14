/**
 * Plugin to transform JS programs into ANF form.
 *
 * WARNING:
 * The plugin assumes that the assumptions stated in ./src/desugarLoop.js
 * hold. The resulting output is not guarenteed to be in ANF form if the
 * assumptions do not hold.
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import * as h from './helpers';

// Object to contain the visitor functions
const callExpression : VisitNode<t.CallExpression> = function (path: NodePath<t.CallExpression>): void {
  const p = path.parent;
  if (!t.isVariableDeclarator(p) && !t.isReturnStatement(p)) {
    // Name the function application if it is not already named.
    const name = path.scope.generateUidIdentifier('app');
    const bind = h.letExpression(name, path.node);
    path.getStatementParent().insertBefore(bind);
    path.replaceWith(name);
  }
};

const newExpression : VisitNode<t.NewExpression> = function (path: NodePath<t.NewExpression>): void {
  const p = path.parent;
  if (!t.isVariableDeclarator(p) && !t.isReturnStatement(p)) {
    // Name the function application if it is not already named.
    const name = path.scope.generateUidIdentifier('app');
    const bind = h.letExpression(name, path.node);
    path.getStatementParent().insertBefore(bind);
    path.replaceWith(name);
  }
};

const anfVisitor : Visitor = {
  CallExpression: callExpression,
  NewExpression: newExpression,
}

module.exports = function() {
  return { visitor: anfVisitor };
};
