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
import * as boxAssignables from './boxAssignables';
import * as desugarNew from '../common/desugarNew';
import * as anf from '../common/anf';
import * as label from './label';
import * as jumper from './jumper';
import * as declVars from './declVars';
import * as nameExprs from './nameExprs';
import hygiene from '../common/hygiene';
import * as freeIds from '../common/freeIds';

import { transform, letExpression } from '../common/helpers';
import { NodePath, Visitor } from 'babel-traverse';
import * as babylon from 'babylon';
import * as t from 'babel-types';
import * as babel from 'babel-core';

function trans(path: NodePath<t.Node>, plugins: any[]) {
  const opts = {
    plugins: plugins,
    babelrc: false,
    code: false,
    ast: false
  };
  babel.transformFromAst(path.node, undefined, opts);
}

const visitor: Visitor = {
  Program(path: NodePath<t.Program>, state) {
    const finalStatement =
      (state.opts.useReturn
       ? (e: t.Expression) => t.returnStatement(e)
       : (e: t.Expression) => t.expressionStatement(e));

    trans(path, [desugarNew]);

    trans(path,
          [[hygiene, { reserved: ["target"] }],
           makeBlocks, nameExprs, desugarLoop, desugarLabel,
        desugarSwitch, desugarLogical]);
    trans(path, [anf]);
    trans(path, [declVars]);
    freeIds.annotate(path);
    trans(path, [boxAssignables]);
    trans(path, [label]);
    trans(path, [[jumper, { captureMethod: 'lazyExn' }]]);
    path.node.body.unshift(
      letExpression(
        t.identifier("$handleNew"),
        t.memberExpression(t.identifier("$__R"), t.identifier("handleNew")),
        "const"));
    path.node.body.unshift(
      letExpression(
        t.identifier("callCC"),
        t.memberExpression(t.identifier("$__R"), t.identifier("callCC")),
        "const"));
    path.node.body.unshift(
      letExpression(
        t.identifier("suspendCC"),
        t.memberExpression(t.identifier("$__R"), t.identifier("suspendCC")),
        "const"));
    path.node.body.unshift(
      letExpression(
        t.identifier("$__R"),
        t.callExpression(
          t.identifier("require"),
          [t.stringLiteral("stopify/built/src/callcc/runtime")]),
        "const"));
    path.node.body.push(
      finalStatement(
        t.callExpression(
          t.memberExpression(t.identifier("$__R"), t.identifier("runtime")),
          [t.identifier("$program")])));

    if (state.opts.useReturn) {
      const isStop = t.identifier("$isStop");
      const onStop = t.identifier("$onStop");
      const onDone = t.identifier("$onDone");
      const interval = t.identifier("$interval");

      path.node.body = [t.expressionStatement(
        t.functionExpression(
          void 0,
          [isStop, onStop, onDone, interval], t.blockStatement(path.node.body, path.node.directives)))];
      path.node.directives = undefined;
    }
    path.stop();
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
