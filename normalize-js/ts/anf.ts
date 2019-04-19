/**
 * Plugin to transform JS programs into ANF form.
 *
 * WARNING:
 * The plugin assumes that the assumptions stated in ./src/desugarLoop.js
 * hold. The resulting output is not guarenteed to be in ANF form if the
 * assumptions do not hold.
 */

import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import * as h from './helpers';
import * as fastFreshId from './fastFreshId';

function withinTryBlock(path: NodePath<t.Node>): boolean {
  const funOrTryParent = path.findParent(p => p.isFunction() || p.isTryStatement());
  return t.isTryStatement(funOrTryParent);
}

type S =  { opts: { nameReturns: boolean } };

export const visitor : Visitor<S> = {
  FunctionExpression(path) {
    const p = path.parent;
    if (!t.isVariableDeclarator(p)) {
      // Name the function application if it is not already named.
      const name = fastFreshId.fresh('fun');
      const bind = h.letExpression(name, path.node);
      path.getStatementParent().insertBefore(bind);
      path.replaceWith(name);
    }
  },

  ArrayExpression(path) {
    if (!h.containsCall(path)) {
      return;
    }
    const { elements: es } = path.node;
    let elements = es as t.Expression[];
    elements.forEach((e: t.Expression, i) => {
      const id = fastFreshId.fresh('element');
      path.getStatementParent().insertBefore(h.letExpression(id, e));
      path.node.elements[i] = id;
    });
  },

  ObjectExpression(path) {
    if (!h.containsCall(path)) {
      return;
    }
    const { properties: ps } = path.node;
    let properties = ps as t.ObjectProperty[];
    properties.forEach((p: t.ObjectProperty, i) => {
      if (!t.isObjectProperty) {
        throw new Error(`Expected ObjectProperty but got ${p.type}`);
      }
      const id = fastFreshId.fresh('element');
      path.getStatementParent().insertBefore(h.letExpression(id, p.value as t.Expression));
      (<t.ObjectProperty>path.node.properties[i]).value = id;
    });
  },
  CallExpression: {
    enter(path) {
      if (h.containsCall(path)) {
        if (t.isCallExpression(path.node.callee)) {
          const id = fastFreshId.fresh('callee');
          path.getStatementParent().insertBefore(
            h.letExpression(id, path.node.callee));
          path.node.callee = id;
        }
        (path.node.arguments as t.Expression[]).forEach((e: t.Expression, i) => {
          const id = fastFreshId.fresh('arg');
          path.getStatementParent().insertBefore(h.letExpression(id, e));
          path.node.arguments[i] = id;
        });
      }
    },
    exit(path, state: { opts: { nameReturns: boolean } }) {
      if ((<any>path.node.callee).mark === 'Flat') {
        return;
      }
      const p = path.parent;
      if ((!t.isVariableDeclarator(p) &&
           (!t.isReturnStatement(p) || state.opts.nameReturns)) ||
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

  NewExpression(path) {
    if ((<any>path.node.callee).mark === 'Flat') {
      return;
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
};