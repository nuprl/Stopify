/**
 * This is the entrypont for stopify.bundle.js. A page that includes this
 * entrypoint can only run stopified code that is compiled on the server.
 * To run the compiler in the browser, see compiler.ts.
 */
import { Opts, AsyncRun } from '../types';
import { RuntimeInterface } from 'stopify-continuations/dist/src/runtime/abstractRuntime';
import { AbstractRunner } from '../runtime/abstractRunner';
// We need to provide these for stopify-continuations
export * from 'stopify-continuations/dist/src/runtime/runtime';
export * from 'stopify-continuations/dist/src/runtime/implicitApps';

// For testing / benchmarking convenience.
export { parseRuntimeOpts } from '../cli-parse';

let runner : Runner | undefined;

export class Runner extends AbstractRunner {

  constructor(private url: string, continuationsRTS: RuntimeInterface, opts: Opts) {
    super(continuationsRTS, opts);
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
 * Control the execution of a pre-compiled program.
 *
 * @param url URL of a pre-compiled program
 * @param opts runtime settings
 */
export function makeStopify(continuationsRTS: RuntimeInterface) {
  return function(url: string, opts: Opts): AsyncRun {
    runner = new Runner(url, continuationsRTS, opts);
    return runner;
  };
}

export function suspend() {
  return runner!.suspend();
}

export function onEnd() {
  return runner!.onEnd();
}
