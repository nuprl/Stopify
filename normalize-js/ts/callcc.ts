/**
 * Adds support for callCC.
 *
 * This module is a Node plugin. In addition, it can be applied from the
 * command line:
 *
 * node built/src/callcc/callcc <filename.js>
 */
const arrowFunctions = require('babel-plugin-transform-es2015-arrow-functions');
import * as desugarLoop from './desugarLoop';
import * as desugarLabel from './desugarLabel';
import * as desugarSwitch from './desugarSwitch';
import * as desugarLogical from './desugarLogical';
import * as singleVarDecls from './singleVarDecls';
import * as makeBlocks from './makeBlockStmt';
import * as anf from './anf';
import * as nameExprs from './nameExprs';
import jumperizeTry from './jumperizeTry';
import * as freeIds from './freeIds';
import cleanup from './cleanup';
import * as h from '@stopify/util';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { timeSlow } from './generic';

const visitor: Visitor = {
  Program(path: NodePath<t.Program>, state) {
    let nameReturns = typeof state.opts.nameReturns === 'boolean' ? state.opts.nameReturns : false;
    timeSlow('cleanup arguments.callee', () =>
      h.transformFromAst(path, [cleanup]));


    timeSlow('arrow functions', () =>
      h.transformFromAst(path, [arrowFunctions]));
    timeSlow('singleVarDecl', () =>
      h.transformFromAst(path, [[singleVarDecls]]));
    timeSlow('free ID initialization', () =>
      freeIds.annotate(path));
    timeSlow('desugaring passes', () =>
      h.transformFromAst(path,
        [makeBlocks, desugarLoop, desugarLabel, desugarSwitch, nameExprs,
         jumperizeTry, nameExprs]));
    timeSlow('desugar logical', () =>
      h.transformFromAst(path, [desugarLogical]));
    timeSlow('ANF', () =>
      h.transformFromAst(path, [[anf, { nameReturns: nameReturns }]]));

    path.stop();
  }
};

export default function() {
  return { visitor };
}
