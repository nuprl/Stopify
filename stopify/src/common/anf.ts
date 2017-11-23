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

type State = {
  parentBlock: t.Statement[],
  parentBlockStack: t.Statement[][],
  inTryBlock: boolean,
  inTryBlockStack: boolean[]
}

function withinTryBlock(path: NodePath<t.Node>): boolean {
  const funOrTryParent = path.findParent(p => p.isFunction() || p.isTryStatement());
  return t.isTryStatement(funOrTryParent);
}

function declareVar(x: t.Identifier): t.Statement {
  return t.variableDeclaration('var', [t.variableDeclarator(x)])
}

function assign(x: t.Identifier, e: t.Expression): t.ExpressionStatement {
  return t.expressionStatement(t.assignmentExpression('=', x, e));
}

function skip<T>(x: T): T {
  (<any>x).__anf_skip__ = true;
  return x;
}

const anfVisitor = {
  Program(this: State, path: NodePath<t.Program>) {
    this.parentBlock = path.node.body;
    this.parentBlockStack = [];
    this.inTryBlock = false;
    this.inTryBlockStack = [];
  },
  Function: {
    enter(this: State, path: NodePath<t.Program>) {
      this.inTryBlockStack.push(this.inTryBlock);
      this.inTryBlock = false;
      this.parentBlockStack.push(this.parentBlock);
      const node = path.node;
      if (t.isFunctionDeclaration(node) ||
          t.isFunctionExpression(node) ||
          t.isObjectMethod(node)) {
        this.parentBlock = node.body.body;
      }
      else {
        throw new Error(`Got ${node.type}`);
      }
    },
    exit(this: State, path: NodePath<t.Program>) {
      this.inTryBlock = this.inTryBlockStack.pop()!;
      this.parentBlock = this.parentBlockStack.pop()!;
    },
  },
  TryStatement: {
    enter(this: State, path: NodePath<t.TryStatement>) {
      this.inTryBlockStack.push(this.inTryBlock);
      this.inTryBlock = true;
    },
    exit(this: State, path: NodePath<t.TryStatement>) {
      this.inTryBlock = this.inTryBlockStack.pop()!;
    },
  },
  ArrayExpression(this: State, path: NodePath<t.ArrayExpression>) {
    if (!h.containsCall(path)) {
      return;
    }
    const { elements } = path.node;
    elements.forEach((e: t.Expression, i) => {
      const id = fastFreshId.fresh('element');
      this.parentBlock.unshift(declareVar(id));
      path.getStatementParent().insertBefore(assign(id, e));
      path.node.elements[i] = id;
    });
  },

  ObjectExpression(this: State, path: NodePath<t.ObjectExpression>) {
    if (!h.containsCall(path)) {
      return;
    }
    const { properties } = path.node;
    properties.forEach((p: t.ObjectProperty, i) => {
      if (!t.isObjectProperty) {
        throw new Error(`Expected ObjectProperty but got ${p.type}`);
      }
      const id = fastFreshId.fresh('element');
      this.parentBlock.unshift(declareVar(id));
      path.getStatementParent().insertBefore(assign(id, p.value));
      (<t.ObjectProperty>path.node.properties[i]).value = id;
    });
  },
  ExpressionStatement(this: State, path: NodePath<t.ExpressionStatement>) {
    if ((<any>path.node).__anf_skip__) {
      path.skip();
    }  
  },
  CallExpression: {
    enter(this: State, path: NodePath<t.CallExpression>) {
      if (h.containsCall(path)) {
        if (t.isCallExpression(path.node.callee)) {
          const id = fastFreshId.fresh('callee');
          this.parentBlock.unshift(declareVar(id));
          path.getStatementParent().insertBefore(assign(id, path.node.callee));
          path.node.callee = id;
        }
        path.node.arguments.forEach((e: t.Expression, i) => {
          const id = fastFreshId.fresh('arg');
          this.parentBlock.unshift(declareVar(id));
          path.getStatementParent().insertBefore(assign(id, e));
          path.node.arguments[i] = id;
        });
      }
    },

    exit(this: State, path: NodePath<t.CallExpression>) {
      if ((<any>path.node.callee).mark == 'Flat') {
        return
      }
      const p = path.parent;
      if ((!t.isVariableDeclarator(p) &&
        !t.isReturnStatement(p)) ||
        (t.isReturnStatement(p) &&
         this.inTryBlock)) {
        // Name the function application if it is not already named or
        // if it is not a flat application.
        const name = fastFreshId.fresh('app');
        // const bind = h.letExpression(name, path.node);
        // path.getStatementParent().insertBefore(bind);
        this.parentBlock.unshift(declareVar(name))
        path.getStatementParent().insertBefore(skip(assign(name, path.node)));

        if (path.parent.type === 'ExpressionStatement') {
          path.remove();
        }
        else {
          path.replaceWith(name);
        }
      }
    }
  },
  // NOTE(arjun): This is probably a bug. Shouldn't NewExpression name
  // applications in sub-expressions (similar to CallExpressions)?
  NewExpression(this: State, path: NodePath<t.NewExpression>) {
    if ((<any>path.node.callee).mark == 'Flat') {
      return
    }
    const p = path.parent;
    if (!t.isVariableDeclarator(p)) {
      // Name the function application if it is not already named.
      const name = fastFreshId.fresh('app');
      this.parentBlock.unshift(declareVar(name));
      path.getStatementParent().insertBefore(skip(assign(name, path.node)));
      path.replaceWith(name);
    }
  },
}

module.exports = function() {
  return { visitor: anfVisitor };
};
