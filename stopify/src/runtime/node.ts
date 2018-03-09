/**
 * Runtime system for Node
 */
import { RuntimeOpts } from '../types';
import { Runtime } from 'stopify-continuations/dist/src/runtime/abstractRuntime';
import { RuntimeWithSuspend } from './suspend';
import { makeEstimator } from './elapsedTimeEstimator';
import { opts as runtimeOpts } from './opts';

let continuationsRTS: Runtime | undefined;

export function init(rts: Runtime, opts: RuntimeOpts = runtimeOpts) {

  continuationsRTS = rts;

  // NOTE(rachit): Setting the number of restored frames in a runtime. This
  // should probably be done while constructing the runtime.
  rts.restoreFrames = opts.restoreFrames;

  const suspendRTS = new RuntimeWithSuspend(continuationsRTS,
    opts.yieldInterval, makeEstimator(opts), opts.stackSize);

  if (typeof opts.stop !== 'undefined') {
    setTimeout(function() {
      suspendRTS.onYield = () => false;
    }, opts.stop * 1000);
  }
  return suspendRTS;
}
