/**
 * This is the entrypont for stopify.bundle.js. A page that includes this
 * entrypoint can only run stopified code that is compiled on the server.
 * To run the compiler in the browser, see compiler.ts.
 */
import { Opts, AsyncRun } from '../types';
import { Runtime } from 'stopify-continuations/dist/src/runtime/abstractRuntime';
import { AbstractRunner } from '../runtime/abstractRunner';
// We need to provide these for stopify-continuations
export * from 'stopify-continuations/dist/src/runtime/runtime';
export * from 'stopify-continuations/dist/src/runtime/implicitApps';

// For testing / benchmarking convenience.
export { parseRuntimeOpts } from '../cli-parse';

let runner : Runner | undefined;

class Runner extends AbstractRunner {

  constructor(private url: string, opts: Opts) {
    super(opts);
   }

  run(onDone: () => void,
    onYield?: () => void,
    onBreakpoint?: (line: number) => void) {
    this.runInit(onDone, onYield, onBreakpoint);
    const script = document.createElement('script');
    script.setAttribute('src', this.url);
    document.body.appendChild(script);
  }
}

/**
 * Called by the stopified program to get suspend() and other functions.
 */
export function init(rts: Runtime): AsyncRun {
  if (runner === undefined) {
    throw new Error('stopify not called');
  }
  return runner.init(rts);
}

/**
 * Control the execution of a pre-compiled program.
 *
 * @param url URL of a pre-compiled program
 * @param opts runtime settings
 */
export function stopify(url: string, opts: Opts): AsyncRun {
  runner = new Runner(url, opts);
  return runner;
}
