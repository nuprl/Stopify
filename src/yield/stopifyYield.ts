const noArrows = require('babel-plugin-transform-es2015-arrow-functions');

import { stopifyFunction, stopifyPrint } from '../interfaces/stopifyInterface'
import * as desugarNew from '../common/desugarNew';
import * as makeBlockStmt from '../common/makeBlockStmt';
import * as yieldPass from './yield';
import * as transformMarked from '../common/transformMarked';
import { transform } from '../common/helpers';
import * as markKnown from '../common/markKnownFunctions'
import * as pAssign from './prototypeAssign'

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
  Object.defineProperty(f.prototype, "constructor", {
    value: f.prototype.constructor, writable: true
  });
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

function *$apply_wrapper(genOrFunc) {
  if (genOrFunc && genOrFunc.next) {
    if($counter >= $interval) {
      $counter = 0;
      yield 0;
    } else {
      $counter ++;
    }
    return yield* genOrFunc
  } else {
    return genOrFunc;
  }
}

const $generatorPrototype = (function*(){}).prototype;

function $proto_assign(rhs) {
  let proto = Object.create(rhs)
  proto.next = $generatorPrototype.next;
  proto.throw = $generatorPrototype.throw;
  proto.return = $generatorPrototype.return;
  proto[Symbol.iterator] = $generatorPrototype[Symbol.iterator]
  return proto
}
`

export const yieldStopifyPrint: stopifyPrint = (code) => {
  const plugins = [
    [noArrows, desugarNew, ],
    [makeBlockStmt], [markKnown], [yieldPass],
    [transformMarked, pAssign, ]
  ];
  const transformed = transform(code, plugins);

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

export const yieldStopify: stopifyFunction = (code) => {
  return eval(`
    (function() {
      return (${yieldStopifyPrint(code)});
    })()
  `)
}
