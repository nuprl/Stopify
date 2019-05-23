/**
 * Runtime system for Node
 */
import { RuntimeOpts } from '../types';
import { Runtime, Result } from '@stopify/continuations-runtime';
import { RuntimeWithSuspend } from './suspend';
import { makeEstimator } from './makeEstimator';
import { parseRuntimeOpts } from '../parse-runtime-opts';

let continuationsRTS: Runtime | undefined;

export function init(
  rts: Runtime,
  opts: RuntimeOpts = parseRuntimeOpts(process.argv.slice(2))) {

  continuationsRTS = rts;

  // This is not ideal. These opts should be passed to the runtime when
  // it is constructed.
  continuationsRTS.stackSize = opts.stackSize;
  continuationsRTS.remainingStack = opts.stackSize;
  continuationsRTS.restoreFrames = opts.restoreFrames;

  const suspendRTS = new RuntimeWithSuspend(continuationsRTS,
    opts.yieldInterval,
    makeEstimator(opts),
    function (): boolean { return false; },
    function (): boolean { return true; },
    function (x: Result): void {
      this.estimator.cancel();
      if (x.type === 'exception') {
        throw x.value;
      }
    });

    if (typeof opts.stop !== 'undefined') {
      setTimeout(function() {
        suspendRTS.onYield = () => false;
      }, opts.stop * 1000);
    }
  let g: any = global;
  g.require = require;
  (suspendRTS as any).g = g;

  let higherOrderFunctions = require(`../stopified/higherOrderFunctions.${continuationsRTS.kind}.node`);

  (suspendRTS as any).stopifyArray = (arr: any[]) => higherOrderFunctions.stopifyArray(arr);
  return suspendRTS;
}
