import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';

const visitor: Visitor = {
  VariableDeclaration: {
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
