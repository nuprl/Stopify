/**
 * This is the entrypoint for stopify-full.bundle.js. A page that includes
 * this entrypoint can compile programs in the browser.
 */
import { CompilerOpts, RuntimeOpts, AsyncRun } from '../types';
import { Runtime } from 'stopify-continuations/dist/src/runtime/abstractRuntime';
import { AbstractRunner } from '../runtime/abstractRunner';
import { compile } from '../compiler/compiler';
import { checkAndFillCompilerOpts } from 'stopify-continuations/dist/src/compiler/check-compiler-opts';
import { checkAndFillRuntimeOpts } from '../runtime/check-runtime-opts';
// We need to provide these for stopify-continuations
export * from 'stopify-continuations/dist/src/runtime/runtime';
export * from 'stopify-continuations/dist/src/runtime/implicitApps';

let runner : Runner | undefined;

class Runner extends AbstractRunner {

  constructor(private code: string, opts: RuntimeOpts) {
    super(opts);
   }

  run(onDone: () => void,
    onYield?: () => void,
    onBreakpoint?: (line: number) => void) {
    this.runInit(onDone, onYield, onBreakpoint);
    eval(this.code);
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
export function stopifyLocally(src: string,
  optionalCompileOpts?: Partial<CompilerOpts>,
  optionalRuntimeOpts?: Partial<RuntimeOpts>): AsyncRun {
  const compileOpts = checkAndFillCompilerOpts(optionalCompileOpts || {});
  const runtimeOpts = checkAndFillRuntimeOpts(optionalRuntimeOpts || {});
  runner = new Runner(compile(src, compileOpts), runtimeOpts);
  return runner;
}
