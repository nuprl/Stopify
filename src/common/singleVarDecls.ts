import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';

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

const visitor: Visitor = {
  VariableDeclaration: {
    enter(path: NodePath<t.VariableDeclaration>) {
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
      if (path.node.declarations.length === 1 && path.node.kind === 'var') {
        const funArgs = getFunctionArgs(path.getFunctionParent());
        const decl = path.node.declarations[0];
        const id = decl.id;
        if (id.type === 'Identifier') {
          if (funArgs.includes(id.name)) {
            if (decl.init === null) {
              path.remove();
            }
            else {
              path.replaceWith(t.assignmentExpression('=', id, decl.init));
            }
          }
        }
      }

    },
    exit(path: NodePath<t.VariableDeclaration>): void {
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
