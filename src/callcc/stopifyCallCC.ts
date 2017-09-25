import callcc from './callcc';
import suspendStop from './suspendStop';
import suspendStep from './suspendStep';
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as h from '../common/helpers';
import * as fs from 'fs';
import * as babylon from 'babylon';
import cleanupGlobals from '../common/cleanupGlobals';
import hygiene from '../common/hygiene';
import markFlatFunctions from '../common/markFlatFunctions';
import * as fastFreshId from '../fastFreshId';
import markFlatApplications from '../common/markFlatApplications'
import { knowns } from '../common/cannotCapture'
import * as exposeImplicitApps from '../exposeImplicitApps';

const allowed = [
  "Object",
  "exports",
  "require",
  "console",
  "global",
  "setTimeout"
];

const reserved = [
  ...knowns,
  exposeImplicitApps.implicitsIdentifier.name,
  "$opts",
  "$result",
  "target",
  "newTarget",
  "SENTINAL",
  "finally_rv",
];

export const visitor: Visitor = {
  Program(path: NodePath<t.Program>, state) {
    const insertSuspend = state.opts.debug ? suspendStep : suspendStop;

    path.stop();

    const filename: string = state.file.opts.filename;

    // NOTE(arjun): Small hack to force the implicitApps file to be in
    // "sane mode". Without something like this, we get non-terminating
    // behavior.
    let esMode: string = state.opts.esMode;
    if (filename.endsWith('implicitApps.js')) {
      esMode = 'sane';
    }

    fastFreshId.init(path);
    const plugs = []
    // Cleanup globals when not running in `func` compile mode
    if (!state.opts.compileFunction) {
      plugs.push([cleanupGlobals, { allowed }])
    }
    if (state.opts.debug) {
      h.transformFromAst(path, [
        ...plugs,
        [hygiene, { reserved }],
      ]);
    } else {
      h.transformFromAst(path, [
        ...plugs,
        [hygiene, { reserved }],
        [markFlatFunctions],
      ]);
      h.transformFromAst(path, [
        markFlatApplications,
      ]);
    }
    h.transformFromAst(path, [[insertSuspend, {
      compileFunction: state.opts.compileFunction,
      sourceMap: state.opts.sourceMap,
    }]]);
    h.transformFromAst(path,
      [[callcc, {
        useReturn: true,
        captureMethod: state.opts.captureMethod,
        handleNew: state.opts.handleNew,
        esMode: esMode,
        compileFunction: state.opts.compileFunction
      }]]);
    fastFreshId.cleanup()
  }
}

export function plugin() {
  return {
    visitor: visitor
  };
}
