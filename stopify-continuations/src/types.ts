export type CaptureMethod = 'eager' | 'retval' | 'lazy' | 'original' | 'fudge';
export type HandleNew = 'direct' | 'wrapper';

export interface CompilerOpts {
  compileFunction?: boolean,
  knownFlats?: string[],
  getters: boolean,
  debug: boolean,
  captureMethod: CaptureMethod,
  newMethod: HandleNew,
  eval: boolean,
  es: 'sane' | 'es5',
  hofs: 'builtin' | 'fill',
  jsArgs: 'simple' | 'faithful' | 'full',
  requireRuntime: boolean,
  sourceMap?: any,
  externals: string[]
}


export interface Runtime {
  // Remaining number of stacks that this runtime can consume.
  remainingStack: number;

  // Current line number in the source program. Used in `--debug` mode.
  linenum: undefined | number;

  isSuspended: boolean;
  delimitDepth: number;
  stackSize: number;
  restoreFrames: number;

  resumeFromSuspension(thunk: () => any): void;
  delimit(thunk: () => any): any;

  // Try to resume the program. If the program has been suspended externally,
  // this does nothing. Otherwise, it runs the next function in the queue.
  // resume(): any;

  // Top level function that runs a given program. Handles capture and restore
  // events that may be emitted by the program.
  runtime(body: () => any): any;

  // Called when the stack needs to be captured.
  captureCC(f: (k: any) => any): void;
}
