import * as t from 'babel-types';
import { Result } from '@stopify/continuations-runtime';

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
  es: 'sane' | 'es5',
  jsArgs: 'simple' | 'faithful' | 'full',
  requireRuntime: boolean,
  sourceMap: LineMapping,
  onDone: t.FunctionExpression,
  eval2: boolean,
  compileMode: 'library' | 'normal'
}

export type Runner = {
  run: (onDone: (result: Result) => void) => void,
  processEvent: (body: () => any, receiver: (x: Result) => void) => void,
  control: (f: (k: (v: any) => void) => void) => void,
  g: { [key: string]: any}
};