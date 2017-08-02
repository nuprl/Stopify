import * as babel from 'babel-core';
import * as t from 'babel-types';
import * as h from '../common/helpers';
import { NodePath, Visitor } from 'babel-traverse';
import * as stopifyCallCC from './stopifyCallCC';
import * as assert from 'assert';

const visitor: Visitor = {
  Program(path: NodePath<t.Program>) {
    path.stop();
    h.transformFromAst(path, [ stopifyCallCC.plugin ]);
    assert.equal(path.node.body.length, 1);
    const stmt = path.node.body[0];
    if (stmt.type !== 'ExpressionStatement') {
      throw 'Expected ExpressionStatement';
    }
    const expr = stmt.expression;
    stmt.expression = 
      t.assignmentExpression(
        '=',
        t.memberExpression(t.identifier('module'), t.identifier('exports')),
        expr);
  }
};

export default function() {
  return { visitor };
}

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
