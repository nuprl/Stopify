/**
 * Adds support for callCC.
 *
 * This module is a Node plugin. In addition, it can be applied from the
 * command line:
 *
 * node built/src/callcc/callcc <filename.js>
 */
import * as desugarLoop from '../common/desugarLoop';
import * as desugarLabel from '../common/desugarLabel';
import * as desugarSwitch from '../common/desugarSwitch';
import * as desugarLogical from '../common/desugarLogical';
import * as makeBlocks from '../common/makeBlockStmt';
import * as anf from '../common/anf';
import * as label from './label';
import * as jumper from './jumper';
import * as declVars from './declVars';
import * as nameExprs from './nameExprs';
import { transform, letExpression } from '../common/helpers';
import { NodePath, Visitor } from 'babel-traverse';
import * as babylon from 'babylon';
import * as t from 'babel-types';
import * as babel from 'babel-core';
import * as fs from 'fs';

function trans(path: NodePath<t.Node>, plugins: any[]) {
  const opts = { plugins: plugins, babelrc: false };
  babel.transformFromAst(path.node, undefined, opts).ast!;
}

const visitor: Visitor = {
  Program(path: NodePath<t.Program>) {
    trans(path,
          [makeBlocks, nameExprs, desugarLoop, desugarLabel, desugarSwitch,
           desugarLogical]);
    trans(path, [anf]);
    trans(path, [declVars]);
    trans(path, [label]);
    trans(path, [jumper]);
    path.node.body.unshift(
      letExpression(
        t.identifier("$__R"),
        t.callExpression(
          t.identifier("require"),
          [t.stringLiteral("stopify/built/src/callcc/runtime")]),
        "const"));
    path.node.body.push(
      t.expressionStatement(
        t.callExpression(
          t.memberExpression(t.identifier("$__R"), t.identifier("runtime")),
          [t.identifier("$program")])));
  }
};

module.exports = function() {
  return { visitor };
}

function main() {
  const filename = process.argv[2];
  const opts = { plugins: [() => ({ visitor })], babelrc: false };
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
