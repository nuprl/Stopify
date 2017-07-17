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
import { transform, letExpression } from '../common/helpers';
import { NodePath, Visitor } from 'babel-traverse';
import * as babylon from 'babylon';
import * as t from 'babel-types';
import * as babel from 'babel-core';

function trans(path: NodePath<t.Node>, plugins: any[]) {
  const opts = { plugins: plugins, babelrc: false };
  babel.transformFromAst(path.node, undefined, opts).ast!;
}

const visitor: Visitor = {
  CallExpression(path: NodePath<t.CallExpression>) {
    if (!(path.node.callee.type === "Identifier" &&
          path.node.callee.name === "setTimeout")) {
      return;
    }
    // Calls to setTimeout need to re-enter the runtime
    path.node.arguments[0] =
      t.functionExpression(
        undefined, [],
        t.blockStatement(
          [t.expressionStatement(
            t.callExpression(
              t.memberExpression(t.identifier("$__R"), t.identifier("runtime")),
              [path.node.arguments[0]]))]));
  },
  Program(path: NodePath<t.Program>, state) {
    const finalStatement =
      (state.opts.useReturn
       ? (e: t.Expression) => t.returnStatement(e)
       : (e: t.Expression) => t.expressionStatement(e));

    trans(path, [desugarNew]);

    // This is a little hack to swap out the implementation of handleNew
    // that the transform has baked in.  It only works with yield.
    path.traverse({
      FunctionExpression(path: NodePath<t.FunctionExpression>) {
        if (path.node.id !== null && path.node.id.name === "$handleNew") {
          path.replaceWith(t.memberExpression(t.identifier("$__R"), t.identifier("handleNew")));
          path.stop();
        }
        else {
          path.skip();
        }
      }
    });

    trans(path,
      [makeBlocks, nameExprs, desugarLoop, desugarLabel,
        desugarSwitch, desugarLogical]);
    trans(path, [anf]);
    trans(path, [declVars, boxAssignables]);
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
          [isStop, onStop, onDone, interval], t.blockStatement(path.node.body)))];
    }
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
