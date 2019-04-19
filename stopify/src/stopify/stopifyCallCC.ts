import * as t from '@babel/types';
import { Visitor } from '@stopify/normalize-js/dist/ts/types';
import * as callcc from 'stopify-continuations-compiler';
import * as suspendStop from './suspendStop';
import * as suspendStep from './suspendStep';
import { timeSlow } from '../generic';
import * as useGlobalObject from '../compiler/useGlobalObject';
import * as exposeHOFs from '../compiler/exposeHOFs';
import * as normalizeJs from '@stopify/normalize-js';
import * as assert from 'assert';
import * as gen from '@babel/generator';

export const visitor: Visitor<{ filename?: string, opts: callcc.CompilerOpts }> = {
  Program(path, state) {
    const opts: callcc.CompilerOpts = state.opts;
    const insertSuspend = state.opts.debug ? suspendStep : suspendStop;

    const onDoneBody: t.Statement[] = [];
    opts.onDone = t.functionExpression(t.identifier('onDone'), [t.identifier('result')],
      t.blockStatement(onDoneBody));
    if (!opts.compileFunction) {
      onDoneBody.push(
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('$S'), t.identifier('onEnd')),
            [t.identifier('result')])));
    }

    const filename = state.filename!;

    // NOTE(arjun): Small hack to force the implicitApps file to be in
    // "sane mode". Without something like this, we get non-terminating
    // behavior.
    if (filename && filename.endsWith('implicitApps.js')) {
      assert(false);
      // state.opts.esMode = 'sane';
    }

    normalizeJs.fastFreshId.init(path);
    normalizeJs.traverse(path, normalizeJs.hygiene, { reserved: callcc.reserved });

    if (!opts.compileFunction) {
      // NOTE(arjun): This needs to occur before flatness. Flatness does
      // something (I don't know what) that this transformation messes up
      // badly. It is likely the annotations that flatness puts on
      // call expressions.
      normalizeJs.traverse(path, useGlobalObject.visitor, {} as any);
    }
    if (!state.opts.debug) {
      normalizeJs.traverse(path, callcc.flatness);
    }
    timeSlow('insertSuspend', () =>
      normalizeJs.traverse(path, insertSuspend.visitor, state));


    if (opts.hofs === 'fill') {
      normalizeJs.traverse(path, exposeHOFs.visitor);
    }

    timeSlow('(control ...) elimination', () =>
      normalizeJs.traverse(path, callcc.visitor, state));

    normalizeJs.fastFreshId.cleanup();

    if (opts.compileFunction) {
      // Do nothing
    }
    else if (opts.requireRuntime) {
      // var $S = require('stopify/dist/src/runtime/rts').init($__R);;

      path.node.body.splice(3, 0,
      t.variableDeclaration('var',
          [t.variableDeclarator(
            t.identifier('$S'),
            t.callExpression(
              t.memberExpression(
                t.callExpression(t.identifier('require'),
                  [t.stringLiteral('stopify/dist/src/runtime/node')]),
                t.identifier('init')),
                [t.identifier('$__R')]))]));
    } else {
      // var $S = stopify.init($__R);

      path.node.body.splice(3, 0,
        t.variableDeclaration('var',
            [t.variableDeclarator(
              t.identifier('$S'),
              t.callExpression(
                t.memberExpression(
                  t.identifier('stopify'),
                  t.identifier('init')),
                  [t.identifier('$__R')]))]));
    }
    path.replaceWith(path.node);
    path.stop();
  }
};