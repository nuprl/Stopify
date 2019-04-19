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
import { Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import * as exposeImplicitApps from '../exposeImplicitApps';
import * as exposeGS from '../exposeGettersSetters';
import * as types from '../types';
import { babelHelpers as bh, traverse } from '@stopify/normalize-js';
import { runtimePath } from '../helpers';


const $__R = t.identifier('$__R');
const $__C = t.identifier('$__C');
const $top = t.identifier('$top');

export const visitor: Visitor<{ opts: types.CompilerOpts }> = {
  Program(path, state) {
    const opts = state.opts;

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
      traverse(path, exposeGS.visitor, { opts: opts });
    }

    if (opts.newMethod === 'wrapper') {
      traverse(path, desugarNew.visitor, { opts: opts });
    }

    if (opts.es === 'es5') {
      traverse(path, exposeImplicitApps.visitor, { opts: opts });
    }

    const inner: Visitor = {
      Program(path) {
        traverse(path, boxAssignables.visitor, { opts: opts } as any);
        traverse(path, declVars.visitor);
        traverse(path, label.visitor);
        traverse(path, jumper.visitor, { opts: opts });
        path.stop();
      }
    };

    let node = normalizeJs.babelHelpers.transformFromAst(path.node, [
      [ () => ({ visitor: normalizeJs.visitor }),
        { nameReturns: opts.captureMethod === 'catch' } ]
    ]);
    node = normalizeJs.babelHelpers.transformFromAst(node, [
      [ () => ({ visitor: inner }), opts ]
    ]);

    if (!doNotWrap) {
      const id = opts.onDone.id as t.Identifier;
      // $__R.runtime($top, opts.onDone);
      node.body.push(bh.letExpression(id, opts.onDone as t.Expression, 'const'));
      node.body.push(t.expressionStatement(
        t.callExpression(
          t.memberExpression($__R, t.identifier('runtime')),
          [t.memberExpression($top, t.identifier('box')), id])));
    }


    if (!state.opts.compileFunction) {
      node.body.unshift(
        bh.letExpression(
          $__R,
           t.callExpression(
             t.memberExpression(t.identifier('$__T'),
               t.identifier('newRTS')),
              [t.stringLiteral(opts.captureMethod)]),
          'var'));
      node.body.unshift(
        bh.letExpression(
          t.identifier("$__T"),
          !opts.requireRuntime ?
            t.identifier('stopify')
            : t.callExpression(t.identifier('require'),
                [t.stringLiteral(`${runtimePath}/runtime`)]),
          'var'));
    }

    if (!doNotWrap) {
      const req = opts.requireRuntime ?
        t.callExpression(t.identifier('require'),
          [t.stringLiteral('stopify/dist/src/stopify/compileFunction')]) :
        t.memberExpression(t.identifier('stopify'), t.identifier('compiler'));

      node.body.unshift(
        bh.letExpression(
          $__C, req, 'const'));
    }
    path.replaceWith(node);
    path.stop();
  }
};
