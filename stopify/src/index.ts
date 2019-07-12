import *  as types from './types';
import { compile } from './compiler/compiler';
import { checkAndFillCompilerOpts } from '@stopify/continuations/dist/src/compiler/check-compiler-opts';
import { getSourceMap } from '@stopify/continuations';
export * from './entrypoints/compiler';

export function stopify(src: string,
  opts: Partial<types.CompilerOpts>): string {

  if (opts && opts.captureMethod === 'original') {
    return `${src};window.originalOnDone();`;
  }
  return compile(src, checkAndFillCompilerOpts(opts, getSourceMap(src)));
}
