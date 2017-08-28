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
import * as fastFreshId from '../fastFreshId';

function withinTryBlock(path: NodePath<t.Node>): boolean {
  const funOrTryParent = path.findParent(p => p.isFunction() || p.isTryStatement());
  return t.isTryStatement(funOrTryParent);
}

const anfVisitor : Visitor = {
  CallExpression: function (path: NodePath<t.CallExpression>): void {
    const p = path.parent;
    if ((!t.isVariableDeclarator(p) &&
      !t.isReturnStatement(p)) ||
      (t.isReturnStatement(p) &&
        withinTryBlock(path))) {
      // Name the function application if it is not already named.
      const name = fastFreshId.fresh('app');
      const bind = h.letExpression(name, path.node);
      path.getStatementParent().insertBefore(bind);

      if (path.parent.type === 'ExpressionStatement') {
        path.remove();
      }
      else {
        path.replaceWith(name);
      }
    }
  },

  NewExpression: function (path: NodePath<t.NewExpression>): void {
    const p = path.parent;
    if ((!t.isVariableDeclarator(p) &&
      !t.isReturnStatement(p)) ||
      (t.isReturnStatement(p) &&
        withinTryBlock(path))) {
      // Name the function application if it is not already named.
      const name = fastFreshId.fresh('app');
      const bind = h.letExpression(name, path.node);
      path.getStatementParent().insertBefore(bind);
      path.replaceWith(name);
    }
  },
}

module.exports = function() {
  return { visitor: anfVisitor };
};
