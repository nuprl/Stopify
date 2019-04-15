/**
 * Adds support for callCC.
 *
 * This module is a Node plugin. In addition, it can be applied from the
 * command line:
 *
 * node built/src/callcc/callcc <filename.js>
 */
const arrowFunctions = require('babel-plugin-transform-es2015-arrow-functions');
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
import jumperizeTry from './jumperizeTry';
import * as freeIds from '../common/freeIds';
import cleanup from './cleanup';
import * as h from '../common/helpers';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as babel from 'babel-core';
import { timeSlow } from '../generic';
import * as exposeImplicitApps from '../exposeImplicitApps';
import * as exposeGS from '../exposeGettersSetters';
import * as types from '../types';
import * as bh from '../babelHelpers';

const $__R = t.identifier('$__R');
const $__C = t.identifier('$__C');
const $top = t.identifier('$top');

const visitor: Visitor = {
  Program(path: NodePath<t.Program>, state) {
    const opts: types.CompilerOpts  = state.opts;

    const doNotWrap = (<any>opts).renames || opts.compileFunction || 
      opts.eval2 || opts.compileMode === 'library';

    if (!doNotWrap) {
      // Wrap the program in 'function $top() { body }'
      path.node.body = [
        t.functionDeclaration($top, [], t.blockStatement(path.node.body))
      ];
    }

    // For eval, wrap the expression in 'function() { body }', which lets the
    // rest of the code insert instrumentation to pause during eval. Note that
    // later passes will create a name for this anonymous function to allow
    // reentry.
    if (opts.eval2) {
      path.node.body = [
        t.expressionStatement(
          t.functionExpression(undefined, [], 
            t.blockStatement(bh.returnLast(path.node.body))))
      ];
    }

    timeSlow('cleanup arguments.callee', () =>
      h.transformFromAst(path, [cleanup]));

    if (opts.getters) {
      h.transformFromAst(path, [exposeGS.plugin]);
    }

    if (opts.newMethod === 'wrapper') {
      h.transformFromAst(path, [[desugarNew, opts]]);
    }

    if (opts.es === 'es5') {
      h.transformFromAst(path, [[exposeImplicitApps.plugin, opts]]);
    }

    timeSlow('arrow functions', () =>
      h.transformFromAst(path, [arrowFunctions]));
    timeSlow('singleVarDecl', () =>
      h.transformFromAst(path, [[singleVarDecls]]));
    timeSlow('free ID initialization', () =>
      freeIds.annotate(path));
    timeSlow('box assignables', () =>
      h.transformFromAst(path, [[boxAssignables.plugin, opts]]));

    timeSlow('desugaring passes', () =>
      h.transformFromAst(path,
        [makeBlocks, desugarLoop, desugarLabel, desugarSwitch, jumperizeTry,
          nameExprs]));
    timeSlow('desugar logical', () =>
      h.transformFromAst(path, [desugarLogical]));
    timeSlow('ANF', () =>
      h.transformFromAst(path, [[anf, opts]]));
    timeSlow('declVars', () =>
      h.transformFromAst(path, [declVars]));
    // If stopifying eval'd string at runtime, don't delimit statements so that
    // we can suspend through the eval.
    timeSlow('label', () =>
      h.transformFromAst(path, [label.plugin]));
    timeSlow('jumper', () =>
      h.transformFromAst(path, [[jumper.plugin, opts]]));

    path.stop();

    if (!doNotWrap) {
      const id = opts.onDone.id;
      // $__R.runtime($top, opts.onDone);
      path.node.body.push(h.letExpression(id, opts.onDone as t.Expression, 'const'));
      path.node.body.push(t.expressionStatement(
        t.callExpression(
          t.memberExpression($__R, t.identifier('runtime')),
          [t.memberExpression($top, t.identifier('box')), id])));
    }


    if (!state.opts.compileFunction) {
      path.node.body.unshift(
        h.letExpression(
          $__R,
           t.callExpression(
             t.memberExpression(t.identifier('$__T'),
               t.identifier('newRTS')),
              [t.stringLiteral(opts.captureMethod)]),
          'var'));
      path.node.body.unshift(
        h.letExpression(
          t.identifier("$__T"),
          !opts.requireRuntime ?
            t.identifier('stopify')
            : t.callExpression(t.identifier('require'),
                [t.stringLiteral(`${h.runtimePath}/runtime`)]),
          'var'));
    }

    if (!doNotWrap) {
      const req = opts.requireRuntime ?
        t.callExpression(t.identifier('require'),
          [t.stringLiteral('stopify/dist/src/stopify/compileFunction')]) :
        t.memberExpression(t.identifier('stopify'), t.identifier('compiler'));

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
