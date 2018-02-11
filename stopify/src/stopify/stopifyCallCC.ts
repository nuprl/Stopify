import { NodePath, Visitor } from "babel-traverse";
import * as t from "babel-types";
import * as callcc from "stopify-continuations";
import { timeSlow } from "../generic";
import suspendStep from "./suspendStep";
import suspendStop from "./suspendStop";

const allowed = [
  "Object",
  "exports",
  "require",
  "console",
  "global",
  "window",
  "document",
  "setTimeout",
  "captureCC",
];

export const visitor: Visitor = {
  Program(path: NodePath<t.Program>, state) {
    const opts: callcc.CompilerOpts = state.opts;
    (opts as any).useReturn = true;
    const insertSuspend = state.opts.debug ? suspendStep : suspendStop;

    path.stop();

    const filename: string = state.file.opts.filename;

    // NOTE(arjun): Small hack to force the implicitApps file to be in
    // "sane mode". Without something like this, we get non-terminating
    // behavior.
    if (filename.endsWith("implicitApps.js")) {
      state.opts.esMode = "sane";
    }

    if (filename.endsWith("hofs.js")) {
      state.opts.hofs = "builtin";
    }

    callcc.fastFreshId.init(path);
    const plugs: any[] = [];
    // Cleanup globals when not running in `func` compile mode
    if (!state.opts.compileFunction) {
      plugs.push([callcc.cleanupGlobals, { allowed }]);
    }

    timeSlow("hygiene, etc.", () =>
      callcc.transformFromAst(path, [
        ...plugs,
        [callcc.hygiene, { reserved: callcc.reserved }],
      ]));
    if (!state.opts.debug) {
      callcc.transformFromAst(path, [ callcc.flatness ]);
    }
    timeSlow("insertSuspend", () =>
      callcc.transformFromAst(path, [[insertSuspend, opts]]));
    timeSlow("(control ...) elimination", () =>
      callcc.transformFromAst(path, [[callcc.plugin, opts]]));

    callcc.fastFreshId.cleanup();

    if (opts.requireRuntime) {
      // var $S = require('stopify/dist/src/runtime/rts').init($__R);;

      path.node.body.splice(2, 0,
      t.variableDeclaration("var",
          [t.variableDeclarator(
            t.identifier("$S"),
            t.callExpression(
              t.memberExpression(
                t.callExpression(t.identifier("require"),
                  [t.stringLiteral("stopify/dist/src/runtime/node")]),
                t.identifier("init")),
                [t.identifier("$__R")]))]));
    } else if (opts.compileFunction) {
      // Do nothing
    } else {
      // var $S = stopify.init($__R);
      path.node.body.splice(2, 0,
        t.variableDeclaration("var",
            [t.variableDeclarator(
              t.identifier("$S"),
              t.callExpression(
                t.memberExpression(
                  t.identifier("stopify"),
                  t.identifier("init")),
                  [t.identifier("$__R")]))]));
    }

    if (!opts.compileFunction) {
      path.node.body.push(
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier("$__R"), t.identifier("delimit")),
            [t.functionExpression(undefined, [],
              t.blockStatement([
                t.expressionStatement(
                  t.callExpression(
                    t.memberExpression(t.identifier("$S"), t.identifier("onEnd")),
                    []))]))])));
    }
  },
};

export function plugin() {
  return {
    visitor,
  };
}
