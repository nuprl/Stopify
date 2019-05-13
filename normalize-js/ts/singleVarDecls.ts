import * as babel from 'babel-core';
import { NodePath } from 'babel-traverse';
import * as t from 'babel-types';
import * as bh from "@stopify/util";
import { fresh } from '@stopify/hygiene';

function getFunctionArgs(path: NodePath<t.Node>): string[] {
  const node = path.node;
  if (node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression') {
    return (<any>node).params.map((x: t.Identifier) => x.name);
  }
  else {
    return [];
  }
}

type S = {
  renameStack: { [key: string]: string }[],
  functionParent: NodePath<bh.FunWithBody | t.Program>,
  functionParentStack: NodePath<bh.FunWithBody | t.Program>[]
};

const visitFunWithBody = {
  enter(this: S, path: NodePath<bh.FunWithBody>) {
    this.functionParentStack.push(this.functionParent);
    this.functionParent = path;
  },
  exit(this: S, path: NodePath<bh.FunWithBody>) {
    this.functionParent = this.functionParentStack.pop()!;
  }
};

const visitor = {
  Program(this: S, path: NodePath<t.Program>) {
    this.renameStack = [];
    this.functionParent = path;
    this.functionParentStack = [];
  },
  FunctionExpression: visitFunWithBody,
  FunctionDeclaration: visitFunWithBody,
  ObjectMethod: visitFunWithBody,
  ArrowFunctionExpression(path: NodePath<t.ArrowFunctionExpression>) {
    throw new Error("ArrowFunctionExpressions are unsupported");
  },

  Scope: {
    enter(this: S, path: NodePath<t.Scopable>): void {
      (<any>path.node).renames = {};
      this.renameStack.push((<any>path.node).renames);
    },

    exit(this: S, path: NodePath<t.Scopable>): void {
      this.renameStack.pop();
    },
  },
  VariableDeclaration: {
    enter(this: S, path: NodePath<t.VariableDeclaration>) {
      if (path.node.declarations.length !== 1) {
        return;
      }
      const decl = path.node.declarations[0];
      const id = decl.id;
      if (id.type !== 'Identifier') {
        throw new Error(`destructuring is not supported`);
      }
      // This checks for the following case:
      //
      //   function(x) { var x = 10; }
      //
      // is the same as:
      //
      //   function(x) { x = 10; }
      //
      // Therefore, we do not need to lift x. Instead, we eliminate the
      // declaration and only turn it into an assignment.
      if (path.node.kind === 'var') {
        const funArgs = getFunctionArgs(this.functionParent);
        if (funArgs.includes(id.name)) {
          if (decl.init === null) {
            // Case "function (x) { var x; }", we can remove "var x";
            path.remove();
          }
          else {
            // Case "function(x) { var x = 10; }", we turn the declaration
            // into "x = 10" and lift the declaration to the top of the
            // enclosing function (or program).
            path.replaceWith(t.assignmentExpression('=', id, decl.init));
          }
        }
      }
      else {
        // This is a 'const x = ...' or a 'let x = ...' declaration that needs
        // to be eliminated. Babel's 'transform-es2015-block-scoping' plugin is
        // too slow for our purposes. Instead, we do something dumber: we use
        // 'fastFreshId' to rename these variables (even if renaming is
        // unnecessary) and declare them as 'var' statements.
        const decl = path.node.declarations[0];
        const x = fresh(id.name);
        const oldId = id.name, newId = x.name;
        // NOTE(arjun): using rename is likely quadratic. If we have performance
        // issues with this phase, we can maintain a set of renamed variables
        // and avoid repeated traversals.
        path.scope.rename(id.name, x.name);
        path.replaceWith(t.variableDeclaration('var', [decl]));
        this.renameStack[this.renameStack.length-1][oldId] = newId;
      }
    },
    exit(this: S, path: NodePath<t.VariableDeclaration>): void {
      if (path.node.declarations.length > 1) {
        let l = path.node.declarations.map(d =>
          t.variableDeclaration(path.node.kind, [d]));
        path.replaceWithMultiple(l);
      }
    }
  },
};

module.exports = function() {
  return { visitor };
};

function main() {
  const filename = process.argv[2];
  const opts = {
    plugins: [() => ({ visitor })],
    babelrc: false
  };
  babel.transformFile(filename, opts, (err, result) => {
    if (err !== null) {
      throw err;
    }
    console.log(result.code);
  });
}

if (require.main === module) {
  main();
}
