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
import * as supportEval from './eval';
import * as desugarNew from '../common/desugarNew';
import * as anf from '../common/anf';
import * as label from './label';
import * as jumper from './jumper';
import * as declVars from './declVars';
import * as nameExprs from './nameExprs';
import jumperizeTry from './jumperizeTry';
import delimitTopLevel from './delimitTopLevel';
import * as freeIds from '../common/freeIds';
import cleanup from './cleanup';
import * as h from '../common/helpers';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as babel from 'babel-core';
import { timeSlow } from '../generic';
import * as exposeImplicitApps from '../exposeImplicitApps';
import * as exposeHOFs from '../exposeHOFs';
import * as exposeGS from '../exposeGettersSetters';
import * as types from '../types';

const $__R = t.identifier('$__R')
const $__C = t.identifier('$__C')

const visitor: Visitor = {
  Program(path: NodePath<t.Program>, state) {
    const opts: types.CompilerOpts  = state.opts;

    timeSlow('cleanup arguments.callee', () =>
      h.transformFromAst(path, [cleanup]));

    if (opts.getters) {
      h.transformFromAst(path, [exposeGS.plugin])
    }

    if (opts.newMethod === 'wrapper') {
      h.transformFromAst(path, [desugarNew]);
    }

    if (opts.es === 'es5') {
      h.transformFromAst(path, [[exposeImplicitApps.plugin, opts]]);
    }

    if (opts.hofs === 'fill') {
      h.transformFromAst(path, [exposeHOFs.plugin]);
    }

    timeSlow('singleVarDecl', () =>
      h.transformFromAst(path, [[singleVarDecls, opts]]));
    timeSlow('free ID initialization', () =>
      freeIds.annotate(path, opts.eval));
    timeSlow('box assignables', () =>
      h.transformFromAst(path, [[boxAssignables.plugin, opts]]));
    if (opts.eval) {
      timeSlow('instrument eval calls', () =>
        h.transformFromAst(path, [[supportEval.plugin, opts]]));
    }


    timeSlow('desugaring passes', () =>
      h.transformFromAst(path,
        [makeBlocks, desugarLoop, desugarLabel, desugarSwitch, jumperizeTry,
         nameExprs]));
    timeSlow('desugar logical', () =>
      h.transformFromAst(path, [desugarLogical]));
    timeSlow('ANF', () =>
      h.transformFromAst(path, [anf]));
    timeSlow('declVars', () =>
      h.transformFromAst(path, [declVars]));
    // If stopifying eval'd string at runtime, don't delimit statements so that
    // we can suspend through the eval.
    if (!(<any>opts).renames) {
      timeSlow('delimit', () =>
        h.transformFromAst(path, [[delimitTopLevel, opts]]));
    }
    timeSlow('label', () =>
      h.transformFromAst(path, [label.plugin]));
    timeSlow('jumper', () =>
      h.transformFromAst(path, [[jumper.plugin, opts]]));

    path.stop();

    let toShift;
    if (opts.compileFunction) {
      if (t.isFunctionDeclaration(path.node.body[0])) {
        toShift = (<t.FunctionDeclaration>path.node.body[0]).body.body
      }
      else {
        throw new Error('Top-level function expected')
      }
    }
    else {
      toShift = path.node.body
    }

    toShift.unshift(
      h.letExpression(
        t.identifier("RV_SENTINAL"),
        t.objectExpression([]),
        "const"),
      h.letExpression(
        t.identifier("EXN_SENTINAL"),
        t.objectExpression([]),
        "const"));
    toShift.unshift(
      h.letExpression(
        t.identifier("suspendCC"),
        t.memberExpression(t.identifier("$__R"), t.identifier("suspendCC")),
        "const"));
    toShift.unshift(
      h.letExpression(
        t.identifier("captureCC"),
        t.callExpression(
          t.memberExpression(t.memberExpression(t.identifier("$__R"),
            t.identifier("captureCC")), t.identifier("bind")), [$__R]),
        "const"));
    toShift.unshift(
      h.letExpression(
        t.identifier("$handleNew"),
        t.callExpression(
          t.memberExpression(t.memberExpression(t.identifier("$__R"),
            t.identifier("handleNew")), t.identifier('bind')),
          [$__R]),
        "const"));

    if (!state.opts.compileFunction) {
      path.node.body.unshift(
        h.letExpression(
          t.identifier('$__R'),
           t.callExpression(
             t.memberExpression(t.identifier('$__T'),
               t.identifier('newRTS')),
              [t.stringLiteral(opts.captureMethod)]),
          'const'));
      path.node.body.unshift(
        h.letExpression(
          t.identifier("$__T"),
          !opts.requireRuntime ?
            t.identifier('stopify')
            : t.callExpression(t.identifier('require'),
                [t.stringLiteral(`${h.runtimePath}/runtime`)]),
          'const'));
    }

    if (opts.eval && !opts.compileFunction) {

      const req = opts.requireRuntime ?
        t.callExpression(t.identifier('require'),
          [t.stringLiteral('stopify/dist/src/stopify/compileFunction')]) :
        // provided by dist/stopify-compiler.bundle.js
        t.memberExpression(t.identifier('stopifyCompiler'), t.identifier('module'))

      path.node.body.unshift(
        h.letExpression(
          $__C, req, 'const'));
    }

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
