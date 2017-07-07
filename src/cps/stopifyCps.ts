import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface'

// Desugaring transforms.
const noArrows = require('babel-plugin-transform-es2015-arrow-functions');
import * as desugarLoop from '../common/desugarLoop';
import * as desugarFunctionDecl from '../common/desugarFunctionDecl';
import * as desugarNew from '../common/desugarNew';
import * as desugarSwitch from '../common/desugarSwitch';
import * as desugarWhileToFunc from '../common/desugarLoopToFunc';
import * as desugarLabel from '../common/desugarLabel';
import * as liftVar from '../common/liftVar';

// Call Expression naming transform.
import * as makeBlockStmt from '../common/makeBlockStmt';

// CPS transforms.
import * as addKArg from './addContinuationArg';
import * as cps from './cpsSyntax';
import * as applyStop from './stoppableApply';

import * as transformMarked from '../common/transformMarked';

// Helpers
import {transform, Options} from '../common/helpers';

const cpsRuntime = `/*
 * The runtime is wrapped in a function:
 * function($isStop, $onStop, $onDone, $interval).
 * The output of the cps transform expects \`$counter\` to be defined.
 */
"use strict";

let $counter = $interval;

function $mark_func(f) {
  f.$isTransformed = true;
  f.call = f.call.bind(f);
  f.call.$isTransformed = true;
  f.apply = f.apply.bind(f);
  f.apply.$isTransformed = true;
  Object.defineProperty(f, "length", {
    configurable: true,
    value: f.length - 2
  });
  return f;
}

function $onError(arg) {
  throw new Error('Unexpected error: ' + arg);
}

let $topLevelEk = $onError;

function $tryCatch(e) {
  try {
    return $topLevelEk(e);
  } catch (e) {
    return $topLevelEk(e);
  }
}
`;

export const cpsStopifyPrint: stopifyPrint = (code: string, opts: Options) => {
  const plugins = [
    [desugarFunctionDecl, liftVar, noArrows, desugarLoop, desugarLabel,
      desugarNew],
    [desugarSwitch, addKArg, desugarWhileToFunc],
    [makeBlockStmt],
    [cps, transformMarked, applyStop],
  ];
  const transformed: string = transform(code, plugins, opts)[0]

  if(transformed.length < code.length) {
    throw new Error('Transformed code is smaller than original code')
  }

  return `
function $stopifiedProg($isStop, $onStop, $onDone, $interval) {
  ${cpsRuntime}
  try {
    ${transformed}
  } catch (e) {
    return $tryCatch(e);
  }
}
`
}

export const cpsStopify: stopifyFunction = (code: string, opts: Options) => {
  return eval(`
(function () {
  return (${cpsStopifyPrint(code, opts)});
})()
`)
}
