/**
 * This is the entrypont for stopify.bundle.js. A page that includes this
 * entrypoint can only run stopified code that is compiled on the server.
 * To run the compiler in the browser, see compiler.ts.
 */
import { RuntimeOpts, AsyncRun, Result } from '../types';
import { Runtime } from '@stopify/continuations-runtime';
import { AbstractRunner } from '../runtime/abstractRunner';
import { checkAndFillRuntimeOpts } from '../runtime/check-runtime-opts';
// We need to provide these for stopify-continuations
export * from '@stopify/continuations-runtime/dist/src/runtime/runtime';
export * from '@stopify/continuations/dist/src/runtime/implicitApps';

// For testing / benchmarking convenience.
export { parseRuntimeOpts } from '../parse-runtime-opts';

let runner : Runner | undefined;

class Runner extends AbstractRunner {

  constructor(private url: string, opts: RuntimeOpts) {
    super(opts);
   }

  run(onDone: (result: Result) => void,
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
export function stopify(url: string,
  optionalRuntimeOpts: Partial<RuntimeOpts>): AsyncRun {
  const runtimeOpts = checkAndFillRuntimeOpts(optionalRuntimeOpts || {});
  runner = new Runner(url, runtimeOpts);
  return runner;
}
