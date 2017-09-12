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
import * as singleVarDecls from '../common/singleVarDecls';
import * as makeBlocks from '../common/makeBlockStmt';
import * as boxAssignables from './boxAssignables';
import * as desugarNew from '../common/desugarNew';
import * as anf from '../common/anf';
import * as label from './label';
import * as jumper from './jumper';
import * as declVars from './declVars';
import * as nameExprs from './nameExprs';
import nameFinallyReturn from './nameFinallyReturn';
import hygiene from '../common/hygiene';
import * as freeIds from '../common/freeIds';
import cleanup from './cleanup';
import * as h from '../common/helpers';
import { NodePath, Visitor } from 'babel-traverse';
import * as babylon from 'babylon';
import * as t from 'babel-types';
import * as babel from 'babel-core';
import * as fastFreshId from '../fastFreshId';

const visitor: Visitor = {
  Program(path: NodePath<t.Program>, state) {
    let captureMethod = state.opts.captureMethod || 'eager';

    const finalStatement =
      (state.opts.useReturn
       ? (e: t.Expression) => t.returnStatement(e)
       : (e: t.Expression) => t.expressionStatement(e));

    if (state.opts.handleNew === 'wrapper') {
      h.transformFromAst(path, [desugarNew]);
    }
    h.transformFromAst(path, [singleVarDecls]);

    h.transformFromAst(path,
      [makeBlocks, desugarLoop, desugarLabel, desugarSwitch]);
    h.transformFromAst(path, [desugarLogical]);
    h.transformFromAst(path,
      ["transform-es2015-block-scoping", nameExprs, cleanup]);
    freeIds.annotate(path);
    h.transformFromAst(path, [boxAssignables]);
    h.transformFromAst(path, [anf]);
    h.transformFromAst(path, [declVars]);
    h.transformFromAst(path, [nameFinallyReturn]);

    h.transformFromAst(path, [label.plugin]);
    h.transformFromAst(path, [[jumper, {
      captureMethod: captureMethod,
      handleNew: state.opts.handleNew,
    }]]);
    path.node.body.unshift(
      h.letExpression(
        t.identifier("SENTINAL"),
        t.objectExpression([]),
        "const"));
    path.node.body.unshift(
      h.letExpression(
        t.identifier("suspendCC"),
        t.memberExpression(t.identifier("$__R"), t.identifier("suspendCC")),
        "const"));
    path.node.body.unshift(
      h.letExpression(
        t.identifier("captureCC"),
        t.memberExpression(t.identifier("$__R"), t.identifier("captureCC")),
        "const"));
    path.node.body.unshift(
      h.letExpression(
        t.identifier("$handleNew"),
        t.callExpression(t.memberExpression(t.memberExpression(t.identifier("$__R"),
          t.identifier("handleNew")), t.identifier('bind')), [t.identifier('$__R')]),
        "const"));
    path.node.body.unshift(
      h.letExpression(
        t.identifier('$__R'),
        t.callExpression(
          t.memberExpression(t.identifier('$__T'), t.identifier('makeRTS')),
          [t.stringLiteral(captureMethod),
           state.opts.useReturn ? t.identifier('$opts') : t.unaryExpression('void', t.numericLiteral(0))]),
        'const'));
    path.node.body.unshift(
      h.letExpression(
        t.identifier("$__T"),
        t.callExpression(
          t.identifier('require'),
          [t.stringLiteral('Stopify')]),
        'const'));
    path.node.body.push(
      finalStatement(
        t.callExpression(
          t.memberExpression(t.identifier("$__R"), t.identifier("runtime")),
          [t.identifier("$program")])));

    if (state.opts.useReturn) {
      const isStop = t.identifier("$isStop");
      const onStop = t.identifier("$onStop");
      const onDone = t.identifier("$onDone");
      const opts = t.identifier("$opts");

      path.node.body = [t.expressionStatement(
        t.functionExpression(
          void 0,
          [isStop, onStop, onDone, opts], t.blockStatement(path.node.body, path.node.directives)))];
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
    plugins: [[() => ({ visitor }), {
      captureMethod: 'eager',
      handleNew: 'wrapper',
    }]],
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
