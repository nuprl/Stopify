import { Opts } from './types';
import { Runtime } from './callcc/runtime';

import eager from './callcc/eagerRuntime';
import lazy from './callcc/lazyRuntime';
import retval from './callcc/retvalRuntime';
import fudge from './callcc/fudgeRuntime';
import * as elapsedTimeEstimator from './elapsedTimeEstimator';

function unreachable(): never {
  throw new Error("unreachable code was reached!");
}

function makeEstimator(opts: Opts): elapsedTimeEstimator.ElapsedTimeEstimator {
  if (opts.estimator === 'exact') {
    return elapsedTimeEstimator.makeExact();
  }
  else if (opts.estimator === 'countdown') {
    return elapsedTimeEstimator.makeCountdown(opts.timePerElapsed!);
  }
  else if (opts.estimator === 'reservoir') {
    return elapsedTimeEstimator.makeSampleAverage();
  }
  else {
    return unreachable();
  }
}

function modeToBase(mode: string) {
 if (mode === 'eager') {
    return eager;
  }
  else if (mode === 'lazy') {
    return lazy;
  }
  else if (mode === 'retval') {
    return retval;
  }
  else if (mode === 'fudge') {
    return fudge;
  }
  else {
    throw new Error(`unknown runtime system mode: ${mode}`);
  }
}

export function makeRTS(mode: string, opts: Opts): Runtime {
  const estimator = makeEstimator(opts);
  const base = modeToBase(mode);
  return new base(opts.yieldInterval, estimator);
}