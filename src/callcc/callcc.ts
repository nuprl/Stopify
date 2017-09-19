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
import delimitTopLevel from './delimitTopLevel';
import hygiene from '../common/hygiene';
import * as freeIds from '../common/freeIds';
import cleanup from './cleanup';
import * as h from '../common/helpers';
import { NodePath, Visitor } from 'babel-traverse';
import * as babylon from 'babylon';
import * as t from 'babel-types';
import * as babel from 'babel-core';
import * as fastFreshId from '../fastFreshId';
import { timeSlow } from '../generic';
import * as exposeImplicitApps from '../exposeImplicitApps';

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

    if (state.opts.esMode === 'es5') {
      h.transformFromAst(path, [exposeImplicitApps.plugin]);
    }
    timeSlow('singleVarDecl', () =>
      h.transformFromAst(path, [singleVarDecls]));

    timeSlow('desugaring passes', () =>
      h.transformFromAst(path,
        [makeBlocks, desugarLoop, desugarLabel, desugarSwitch]));
    timeSlow('desugar logical', () =>
      h.transformFromAst(path, [desugarLogical]));
    timeSlow('block scoping, etc.', () =>
      h.transformFromAst(path,
        [nameExprs, cleanup]));
    timeSlow('free ID initialization', () =>
      freeIds.annotate(path));
    timeSlow('box assignables', () =>
      h.transformFromAst(path, [[boxAssignables, {
        compileFunction: state.opts.compileFunction
      }]]));
    timeSlow('ANF', () =>
      h.transformFromAst(path, [anf]));
    timeSlow('declVars', () =>
      h.transformFromAst(path, [declVars]));
    timeSlow('delimit', () =>
      h.transformFromAst(path, [delimitTopLevel]));
    timeSlow('nameFinally', () =>
      h.transformFromAst(path, [nameFinallyReturn]));

    timeSlow('label', () =>
      h.transformFromAst(path, [label.plugin]));
    timeSlow('jumper', () =>
      h.transformFromAst(path, [[jumper, {
        captureMethod: captureMethod,
        handleNew: state.opts.handleNew,
        compileFunction: state.opts.compileFunction
      }]]));
    path.node.body.unshift(
      h.letExpression(t.identifier('target'), t.numericLiteral(0), 'var'));
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
          t.memberExpression(t.identifier('$__T'), t.identifier('getRTS')), []),
        'const'));
    path.node.body.unshift(
      h.letExpression(
        t.identifier("$__T"),
        t.callExpression(
          t.identifier('require'),
          [t.stringLiteral('Stopify/built/src/rts')]),
        'const'));
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
