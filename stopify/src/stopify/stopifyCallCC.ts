import * as t from 'babel-types';
import { NodePath, Visitor } from 'babel-traverse';
import * as callcc from 'stopify-continuations';
import suspendStop from './suspendStop';
import suspendStep from './suspendStep';
import { timeSlow } from '../generic';

export const visitor: Visitor = {
  Program(path: NodePath<t.Program>, state) {
    const opts: callcc.CompilerOpts = state.opts;
    const insertSuspend = state.opts.debug ? suspendStep : suspendStop;

    const onDoneBody: t.Statement[] = [];
    opts.onDone = t.arrowFunctionExpression([t.identifier('result')],
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

    if (filename.endsWith('hofs.js')) {
      state.opts.hofs = 'builtin';
    }

    callcc.fastFreshId.init(path);
    const plugs: any[] = [];

    timeSlow('hygiene, etc.', () =>
      callcc.transformFromAst(path, [
        ...plugs,
        [callcc.hygiene, { reserved: callcc.reserved }],
      ]));
    if (!state.opts.debug) {
      callcc.transformFromAst(path, [ callcc.flatness ]);
    }
    timeSlow('insertSuspend', () =>
      callcc.transformFromAst(path, [[insertSuspend, opts]]));

    timeSlow('(control ...) elimination', () =>
      callcc.transformFromAst(path, [[callcc.plugin, opts]]));

    callcc.fastFreshId.cleanup();

    if (opts.eval2) {
      // NOTE(arjun): I feel that this is a little hacky. Does it even belong
      // here? Should it be in stopify-continuations? This kind of code is
      // what makes it very hard for me to understand what the interface to
      // stopify-continuations should be.
      const N = path.node.body.length - 1;
      const funBody = (path.node.body[N] as any).consequent;
      if (!t.isExpressionStatement(funBody)) {
        throw new Error('Expected last statement to be an expression for eval');
      }
      path.node.body[N] = t.expressionStatement(
        t.callExpression(funBody.expression, []));
    }

    if (opts.compileFunction) {
      // Do nothing
    }
    else if (opts.requireRuntime) {
      // var $S = require('stopify/dist/src/runtime/rts').init($__R);;

      path.node.body.splice(opts.eval ? 3 : 2, 0,
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

      path.node.body.splice(opts.eval ? 3 : 2, 0,
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
