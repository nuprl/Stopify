/**
 * Runtime system for Node
 */
import { Opts, AsyncRun } from '../types';
import { Runtime } from 'stopify-continuations/dist/src/runtime/abstractRuntime';
import { RuntimeWithSuspend } from './suspend';
import { makeEstimator } from './elapsedTimeEstimator';
import { parseRuntimeOpts } from '../cli-parse';

const opts = parseRuntimeOpts(process.argv.slice(2));
let continuationsRTS: Runtime | undefined;

export function init(rts: Runtime) {
  continuationsRTS = rts;
  return new RuntimeWithSuspend(continuationsRTS,
    opts.yieldInterval,
    makeEstimator(opts));
}
