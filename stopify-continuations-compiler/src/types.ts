import * as t from 'babel-types';

export interface LineMapping {
  getLine: (line: number, column: number) => number | null
}

export type CaptureMethod = 'eager' | 'retval' | 'lazy' | 'catch' | 'original' | 'fudge';
export type HandleNew = 'direct' | 'wrapper';

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
