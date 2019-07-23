/**
 * Adds support for callCC.
 *
 * This module is a Node plugin. In addition, it can be applied from the
 * command line:
 *
 * node built/src/callcc/callcc <filename.js>
 */
import * as normalizeJs from '@stopify/normalize-js';
import * as boxAssignables from './boxAssignables';
import * as desugarNew from '../common/desugarNew';
import * as label from './label';
import * as jumper from './jumper';
import * as declVars from './declVars';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as babel from 'babel-core';
import * as exposeImplicitApps from '../exposeImplicitApps';
import * as exposeGS from '../exposeGettersSetters';
import * as types from '../types';
import * as bh from '@stopify/util';
import { runtimePath } from '../helpers';

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

    if (opts.getters) {
      bh.transformFromAst(path, [exposeGS.plugin]);
    }

    if (opts.newMethod === 'wrapper') {
      bh.transformFromAst(path, [[desugarNew, opts]]);
    }

    if (opts.es === 'es5') {
      bh.transformFromAst(path, [[exposeImplicitApps.plugin, opts]]);
    }

    bh.transformFromAst(path, [[normalizeJs.plugin, { nameReturns: opts.captureMethod === 'catch' }]]);
    bh.transformFromAst(path, [[boxAssignables.plugin, opts]]);
    bh.transformFromAst(path, [declVars]);
    // If stopifying eval'd string at runtime, don't delimit statements so that
    // we can suspend through the eval.
    bh.transformFromAst(path, [label.plugin]);
    bh.transformFromAst(path, [[jumper.plugin, opts]]);

    path.stop();

    if (!doNotWrap) {
      const id = opts.onDone.id;
      // $__R.runtime($top, opts.onDone);
      path.node.body.push(bh.letExpression(id, opts.onDone as t.Expression, 'const'));
      path.node.body.push(t.expressionStatement(
        t.callExpression(
          t.memberExpression($__R, t.identifier('runtime')),
          [t.memberExpression($top, t.identifier('box')), id])));
    }


    if (!state.opts.compileFunction) {
      path.node.body.unshift(
        bh.letExpression(
          $__R,
           t.callExpression(
             t.memberExpression(t.identifier('$__T'),
               t.identifier('newRTS')),
              [t.stringLiteral(opts.captureMethod)]),
          'var'));
      path.node.body.unshift(
        bh.letExpression(
          t.identifier("$__T"),
          !opts.requireRuntime ?
            t.identifier('stopify')
            : t.callExpression(t.identifier('require'),
                [t.stringLiteral(`${runtimePath}/runtime`)]),
          'var'));
    }

    const req = opts.requireRuntime ?
      t.callExpression(t.identifier('require'),
        [t.stringLiteral('stopify/dist/src/stopify/compileFunction')]) :
      t.memberExpression(t.identifier('stopify'), t.identifier('compiler'));

    path.node.body.unshift(
      bh.letExpression(
        $__C, req, 'const'));
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
