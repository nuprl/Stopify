import * as t from 'babel-types';
export type CaptureMethod = 'eager' | 'retval' | 'lazy' | 'catch' | 'original' | 'fudge';
export type HandleNew = 'direct' | 'wrapper';

export interface LineMapping {
  getLine: (line: number, column: number) => number | null
}

export interface CompilerOpts {
  compileFunction?: boolean,
  getters: boolean,
  debug: boolean,
  captureMethod: CaptureMethod,
  newMethod: HandleNew,
  eval: boolean,
  es: 'sane' | 'es5',
  hofs: 'builtin' | 'fill',
  jsArgs: 'simple' | 'faithful' | 'full',
  requireRuntime: boolean,
  sourceMap: LineMapping,
  onDone: t.Expression,
  eval2: boolean,
  compileMode: 'library' | 'normal'
}

export type Result =
  { type: 'normal', value: any } |
  { type: 'exception', value: any, stack: string[] };

export interface Runtime {
  /**
   * Every instance of runtime has a 'kind' field that indicates the compilation
   * strategy that it supports. An alternative approach would be to have callers
   * check if the runtime is an instanceof LazyRuntime, EagerRuntime, etc.
   * But, that would allow the caller to depend on runtime-specific features.
   * The 'kind' field allows us to keep the implementation abstract, but
   * still allows callers to determine the compilation strategy for the purpose
   * of loading pre-stopified code.
   */
  kind: CaptureMethod;

  // Remaining number of stacks that this runtime can consume.
  remainingStack: number;

  stackSize: number;
  restoreFrames: number;

  endTurn(callback: (onDone: (x: Result) => any) => any): never;

  // Try to resume the program. If the program has been suspended externally,
  // this does nothing. Otherwise, it runs the next function in the queue.
  // resume(): any;

  // Top level function that runs a given program. Handles capture and restore
  // events that may be emitted by the program.
  runtime<T>(body: () => any, onDone: (x: Result) => T): T;

  // Called when the stack needs to be captured.
  captureCC(f: (k: (x: Result) => any) => any): void;
}
