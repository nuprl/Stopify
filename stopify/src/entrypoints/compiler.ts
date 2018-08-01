/**
 * This is the entrypoint for stopify-full.bundle.js. A page that includes
 * this entrypoint can compile programs in the browser.
 */
import * as babylon from 'babylon';
import { RawSourceMap } from 'source-map';
import { CompilerOpts, RuntimeOpts, AsyncRun } from '../types';
import { Runtime, Result } from 'stopify-continuations/dist/src/types';
import { AbstractRunner } from '../runtime/abstractRunner';
import { compileFromAst } from '../compiler/compiler';
import { checkAndFillCompilerOpts } from 'stopify-continuations/dist/src/compiler/check-compiler-opts';
import { checkAndFillRuntimeOpts } from '../runtime/check-runtime-opts';
import { getSourceMap } from 'stopify-continuations';
import * as t from 'babel-types';
// We need to provide these for stopify-continuations
export * from 'stopify-continuations/dist/src/runtime/runtime';
export * from 'stopify-continuations/dist/src/runtime/implicitApps';
export { Result } from 'stopify-continuations/dist/src/types';

let runner : Runner | undefined;

function copyCompilerOpts(compileOpts: CompilerOpts): CompilerOpts {
  return {
    compileFunction: compileOpts.compileFunction,
    getters: compileOpts.getters,
    debug: compileOpts.debug,
    captureMethod: compileOpts.captureMethod,
    newMethod: compileOpts.newMethod,
    eval: compileOpts.eval,
    es: compileOpts.es,
    hofs: compileOpts.hofs,
    jsArgs: compileOpts.jsArgs,
    requireRuntime: compileOpts.requireRuntime,
    sourceMap: compileOpts.sourceMap,
    onDone: compileOpts.onDone,
    eval2: compileOpts.eval2
  };
}

class Runner extends AbstractRunner {

  private evalOpts: CompilerOpts;

  constructor(private code: string,
    compilerOpts: CompilerOpts,
    runtimeOpts: RuntimeOpts) {
    super(runtimeOpts);
    this.evalOpts = copyCompilerOpts(compilerOpts);
    this.evalOpts.eval2 = true;
  }

  run(onDone: (result: Result) => void,
    onYield?: () => void,
    onBreakpoint?: (line: number) => void) {
    this.runInit(onDone, onYield, onBreakpoint);
    eval(this.code);
  }

  evalAsync(src: string, onDone: (result: Result) => void): void {
    const ast = babylon.parse(src).program;
    const stopifiedCode = compileFromAst(ast, this.evalOpts);
    this.onDone = onDone;
    this.continuationsRTS.runtime(() => eval(stopifiedCode), onDone);
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

export function stopifyLocallyFromAst(
  src: t.Program,
  sourceMap?: RawSourceMap,
  optionalCompileOpts?: Partial<CompilerOpts>,
  optionalRuntimeOpts?: Partial<RuntimeOpts>): AsyncRun {
  const compileOpts = checkAndFillCompilerOpts(optionalCompileOpts || {}, 
    sourceMap);
  const runtimeOpts = checkAndFillRuntimeOpts(optionalRuntimeOpts || {});
  const stopifiedCode = compileFromAst(src, compileOpts);
  runner = new Runner(stopifiedCode, compileOpts, runtimeOpts);
  return runner;
}

/**
 * Control the execution of a pre-compiled program.
 *
 * @param url URL of a pre-compiled program
 * @param opts runtime settings
 */
export function stopifyLocally(
  src: string,
  optionalCompileOpts?: Partial<CompilerOpts>,
  optionalRuntimeOpts?: Partial<RuntimeOpts>): AsyncRun {
  return stopifyLocallyFromAst(
    babylon.parse(src).program, 
    getSourceMap(src),
    optionalCompileOpts,
    optionalRuntimeOpts);
}
