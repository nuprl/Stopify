import * as t from 'babel-types';
import { NodePath, Visitor } from 'babel-traverse';
import * as callcc from 'stopify-continuations-compiler';
import suspendStop from './suspendStop';
import suspendStep from './suspendStep';
import { timeSlow } from '../generic';
import * as useGlobalObject from '../compiler/useGlobalObject';
import * as exposeHOFs from '../compiler/exposeHOFs';
import * as normalizeJs from '@stopify/normalize-js';

export const visitor: Visitor = {
  Program(path: NodePath<t.Program>, state) {
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

    path.stop();

    const filename: string = state.file.opts.filename;

    // NOTE(arjun): Small hack to force the implicitApps file to be in
    // "sane mode". Without something like this, we get non-terminating
    // behavior.
    if (filename.endsWith('implicitApps.js')) {
      state.opts.esMode = 'sane';
    }

    normalizeJs.fastFreshId.init(path);

    timeSlow('hygiene, etc.', () =>
      normalizeJs.transformFromAst(path, [
        [normalizeJs.hygiene, { reserved: callcc.reserved }],
      ]));

    if (!opts.compileFunction) {
      // NOTE(arjun): This needs to occur before flatness. Flatness does
      // something (I don't know what) that this transformation messes up
      // badly. It is likely the annotations that flatness puts on
      // call expressions.
      normalizeJs.transformFromAst(path, [[useGlobalObject.plugin, opts]]);
    }
    if (!state.opts.debug) {
      normalizeJs.transformFromAst(path, [ callcc.flatness ]);
    }
    timeSlow('insertSuspend', () =>
      normalizeJs.transformFromAst(path, [[insertSuspend, opts]]));


    if (opts.hofs === 'fill') {
      normalizeJs.transformFromAst(path, [exposeHOFs.plugin]);
    }

    timeSlow('(control ...) elimination', () =>
      normalizeJs.transformFromAst(path, [[callcc.plugin, opts]]));

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
  }
};

export function plugin() {
  return {
    visitor: visitor
  };
}
