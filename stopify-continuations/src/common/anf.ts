/**
 * Plugin to transform JS programs into ANF form.
 *
 * WARNING:
 * The plugin assumes that the assumptions stated in ./src/desugarLoop.js
 * hold. The resulting output is not guarenteed to be in ANF form if the
 * assumptions do not hold.
 */

import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as h from './helpers';
import * as fastFreshId from '../fastFreshId';

function withinTryBlock(path: NodePath<t.Node>): boolean {
  const funOrTryParent = path.findParent(p => p.isFunction() || p.isTryStatement());
  return t.isTryStatement(funOrTryParent);
}

const anfVisitor : Visitor = {
  ArrayExpression: function (path: NodePath<t.ArrayExpression>): void {
    if (!h.containsCall(path)) {
      return;
    }
    const { elements } = path.node;
    elements.forEach((e: t.Expression, i) => {
      const id = fastFreshId.fresh('element');
      path.getStatementParent().insertBefore(h.letExpression(id, e));
      path.node.elements[i] = id;
    });
  },

  ObjectExpression: function (path: NodePath<t.ObjectExpression>): void {
    if (!h.containsCall(path)) {
      return;
    }
    const { properties } = path.node;
    properties.forEach((p: t.ObjectProperty, i) => {
      if (!t.isObjectProperty) {
        throw new Error(`Expected ObjectProperty but got ${p.type}`);
      }
      const id = fastFreshId.fresh('element');
      path.getStatementParent().insertBefore(h.letExpression(id, p.value));
      (<t.ObjectProperty>path.node.properties[i]).value = id;
    });
  },

  CallExpression: {
    enter(path: NodePath<t.CallExpression>): void {
      if (h.containsCall(path)) {
        if (t.isCallExpression(path.node.callee)) {
          const id = fastFreshId.fresh('callee');
          path.getStatementParent().insertBefore(
            h.letExpression(id, path.node.callee));
          path.node.callee = id;
        }
        path.node.arguments.forEach((e: t.Expression, i) => {
          const id = fastFreshId.fresh('arg');
          path.getStatementParent().insertBefore(h.letExpression(id, e));
          path.node.arguments[i] = id;
        });
      }
    },

    exit(path: NodePath<t.CallExpression>): void {
      if ((<any>path.node.callee).mark == 'Flat') {
        return
      }
      const p = path.parent;
      if ((!t.isVariableDeclarator(p) &&
        !t.isReturnStatement(p)) ||
        (t.isReturnStatement(p) &&
          withinTryBlock(path))) {
        // Name the function application if it is not already named or
        // if it is not a flat application.
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
    }
  },

  NewExpression: function (path: NodePath<t.NewExpression>): void {
    if ((<any>path.node.callee).mark == 'Flat') {
      return
    }
    const p = path.parent;
    if (!t.isVariableDeclarator(p)) {
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
