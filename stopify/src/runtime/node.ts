/**
 * Runtime system for Node
 */
import { Opts, AsyncRun } from '../types';
import { Runtime } from 'stopify-continuations/dist/src/runtime/abstractRuntime';
import { RuntimeWithSuspend } from './suspend';
import { makeEstimator } from './elapsedTimeEstimator';
import { parseRuntimeOpts } from '../cli-parse';

let continuationsRTS: Runtime | undefined;

export function init(
  rts: Runtime,
  opts: Opts = parseRuntimeOpts(process.argv.slice(2))) {

  continuationsRTS = rts;
  const suspendRTS = new RuntimeWithSuspend(continuationsRTS,
    opts.yieldInterval,
    makeEstimator(opts));

    if (typeof opts.stop !== 'undefined') {
      setTimeout(function() {
        suspendRTS.onYield = () => false;
      }, opts.stop * 1000);
    }
  return suspendRTS;
}
