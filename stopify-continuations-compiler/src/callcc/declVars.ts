/**
 * Assumes that singleVarDecls has run before this and handled all the `let`
 * and `const` declarations.
 *
 * Moves var statements to the top of functions.
 *
 * When a var is moved, it is initialized to undefined. The
 * transformation introduces assignment statements where the var statement
 * originally occurred.
 */
import * as t from 'babel-types';
import * as h from '@stopify/util';
import { NodePath, Visitor } from 'babel-traverse';

type TopDecl<T> = T & {
  decls?: Array<t.Identifier>
};

const funWithBody = {
  enter (path: NodePath<TopDecl<h.FunWithBody>>) {
    path.node.decls = [];
  },
  exit (path: NodePath<TopDecl<h.FunWithBody>>) {
    if (path.node.decls!.length > 0) {
      const decl = t.variableDeclaration('var',
        path.node.decls!.map(id => t.variableDeclarator(id)));
      path.node.body.body.unshift(decl);
    }
  }
};

const lift: Visitor = {
  Program: {
    enter(path: NodePath<TopDecl<t.Program>>) {
      path.node.decls = [];
    },
    exit(path: NodePath<TopDecl<t.Program>>) {
      if (path.node.decls!.length > 0) {
        const decl = t.variableDeclaration('var',
          path.node.decls!.map(id => t.variableDeclarator(id)));
        path.node.body.unshift(decl);
      }
    },
  },
  FunctionDeclaration: funWithBody,
  FunctionExpression: funWithBody,
  ObjectMethod: funWithBody,
  VariableDeclaration(path: NodePath<t.VariableDeclaration>) {
    const { declarations } = path.node;
    let fParent = path.getFunctionParent().node;

    if (!h.isFunWithBody(fParent) && !t.isProgram(fParent)) {
      throw new Error(
        `Variable declarations should be inside a function. Parent was ${path.node.type}`);
    }

    const stmts: t.Statement[] = [];

    if ((<any>declarations[0]).__boxVarsInit__) {
      return;
    }

    for (const decl of declarations) {
      if (decl.id.type !== 'Identifier') {
        throw new Error(`Destructuring assignment not supported`);
      }

      (fParent as TopDecl<h.FunWithBody | t.Program>).decls!.push(decl.id);

      if (decl.init !== null) {
        // If we call path.insertAfter here, we will add assignments in reverse
        // order. Fortunately, path.replaceWithMultiple can take an array of nodes.
        stmts.push(t.expressionStatement(
          t.assignmentExpression('=', decl.id, decl.init)));
      }
    }
    path.replaceWithMultiple(stmts);
  }
};

module.exports = function() {
  return { visitor: lift };
};
