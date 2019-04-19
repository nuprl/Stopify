/**
 * Adds support for callCC.
 *
 * This module is a Node plugin. In addition, it can be applied from the
 * command line:
 *
 * node built/src/callcc/callcc <filename.js>
 */

import * as desugarLoop from './desugarLoop';
import * as desugarLabel from './desugarLabel';
import * as desugarSwitch from './desugarSwitch';
import * as desugarLogical from './desugarLogical';
import * as singleVarDecls from './singleVarDecls';
import * as makeBlocks from './makeBlockStmt';
import * as anf from './anf';
import * as nameExprs from './nameExprs';
import * as jumperizeTry from './jumperizeTry';
import * as freeIds from './freeIds';
import * as cleanup from './cleanup';
import * as h from './helpers';
import * as t from '@babel/types';
import {  Visitor, NodePath } from '@babel/traverse';
import { timeSlow } from './generic';
import * as fastFreshId from './fastFreshId';
import * as bh from './babelHelpers';
const arrowFunctions = require('@babel/plugin-transform-arrow-functions');

type S = {
  opts: {
    nameReturns: boolean | undefined
  }
};

export function visitorBody(path: NodePath<t.Program>, state: S) {
  let nameReturns = typeof state.opts.nameReturns === 'boolean' ? state.opts.nameReturns : false;
  fastFreshId.init(path);
  timeSlow('cleanup arguments.callee', () =>
    h.traverse(path, cleanup.visitor, {}));

  path.replaceWith(bh.transformFromAst(path.node, [arrowFunctions]));
  timeSlow('singleVarDecl', () =>
    h.traverse(path, singleVarDecls.visitor, {} as any));

  timeSlow('free ID initialization', () =>
    freeIds.annotate(path));

  h.traverse(path, makeBlocks.visitor);
  h.traverse(path, desugarLoop.visitor);
  h.traverse(path, desugarLabel.visitor);
  h.traverse(path, desugarSwitch.visitor);
  h.traverse(path, jumperizeTry.visitor);
  h.traverse(path, nameExprs.visitor);
  h.traverse(path, desugarLogical.visitor);
  h.traverse(path, anf.visitor, { opts: { nameReturns: nameReturns } });
}

export const visitor: Visitor<S> = {
  Program(path, state) {
    visitorBody(path, state);
    path.stop();
  }
};
