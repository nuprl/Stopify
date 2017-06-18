const noArrows = require('babel-plugin-transform-es2015-arrow-functions');

import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface'
import * as desugarNew from '../common/desugarNew';
import * as makeBlockStmt from '../common/makeBlockStmt';
import * as yieldPass from './yield';
import * as transformMarked from '../common/transformMarked';
import { transform } from '../common/helpers';
import * as markKnown from '../common/markKnownFunctions'
import * as renameC from './renameConstructor'

// The runtime needs to be stored as a string to allow for client-side
// compilation.

const yieldRuntime = `
/*
 * The runtime is wrapped in a funtion:
 * function($isStop, $onStop, $onDone, $interval).
 * The output of the yield transform expects $counter to be defined.
 */
const $yieldCounter = $interval;
let $counter = 0;
function $mark_func(f) {
  f.$isTransformed = true;
  f.call = f.call.bind(f);
  f.call.$isTransformed = true
  f.apply = f.apply.bind(f);
  f.apply.$isTransformed = true;
  return f;
};

function $runYield(gen, res = { done: false, value: undefined }) {
  setTimeout(_ => {
    if ($isStop()) {
      return $onStop();
    }
    res = gen.next();
    if (res.done) {
      return $onDone(res.value);
    }
    else {
      return $runYield(gen, res);
    }
  }, 0)
};
`

export const regenStopifyPrint: stopifyPrint = (code) => {
  const plugins = [
    [noArrows, desugarNew, renameC], [makeBlockStmt], [markKnown], [yieldPass],
    [transformMarked]
  ];
  const intermediate = transform(code, plugins);
  const transformed = require('regenerator').compile(intermediate, {
    includeRuntime: true
  }).code;


  if(transformed.length < code.length) {
    throw new Error('Transformed code is smaller than original code')
  }

  return `
  function $stopifiedProg($isStop, $onStop, $onDone, $interval) {
    ${yieldRuntime}
    ${transformed}
  }
  `
}

export const regenStopify: stopifyFunction = (code) => {
  return eval(`
    (function() {
      return (${regenStopifyPrint(code)});
    })()
  `)
}
