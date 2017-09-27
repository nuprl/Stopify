import { Opts } from './types';
import { Runtime } from './callcc/runtime';
import * as assert from 'assert';
import eager from './callcc/eagerRuntime';
import lazy from './callcc/lazyRuntime';
import retval from './callcc/retvalRuntime';
import fudge from './callcc/fudgeRuntime';
import * as elapsedTimeEstimator from './elapsedTimeEstimator';
import runtime from './runtime/default';

export * from './callcc/runtime';

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

function modeToBase(transform: string) {
 if (transform === 'eager') {
    return eager;
  }
  else if (transform === 'lazy') {
    return lazy;
  }
  else if (transform === 'retval') {
    return retval;
  }
  else if (transform === 'fudge') {
    return fudge;
  }
  else {
    throw new Error(`unknown transformation: ${transform}`);
  }
}

let rts : Runtime | undefined = undefined;

/**
 * Initializes the runtime system. This function must be called once and before
 * any stopified code starts running.
 */
export function makeRTS(opts: Opts): Runtime {
  assert(rts === undefined, 'runtime already initialized');
  const estimator = makeEstimator(opts);
  const base = modeToBase(opts.transform);
  rts = new base(opts.yieldInterval, estimator);
  return rts;
}

/**
 * Produces a reference to the runtime system, assuming it is initialized.
 */
export function getRTS(): Runtime {
  if (rts === undefined) {
    throw new assert.AssertionError({ message: 'runtime not initialized' });
  }
  else {
    return rts;
  }
}

function getOpts(): Opts {
  const opts = JSON.parse(
    decodeURIComponent(window.location.hash.slice(1)));
  // JSON turns undefined into null, which compare differently with numbers.
  for (const k of Object.keys(opts)) {
    if (opts[k] === null) {
      delete opts[k];
    }
  }
  return opts;
}

export function afterScriptLoad(M : any) {
  // NOTE(arjun): Idiotic that we are doing this twice
  const opts = getOpts();
  runtime.run(M, opts,  () => {
    window.document.title = "done";
  });
}

export function loadScript() {
  const opts = getOpts();
  // Dynamically load the file
  const script = document.createElement('script');
  script.setAttribute('src', opts.filename);
  document.body.appendChild(script);
}

export function resumeScript() {
  runtime.resume();
}

export function stopScript(onStop: () => any) {
  runtime.stop(onStop);
}

export function stepScript() {
  runtime.step();
}
