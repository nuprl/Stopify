import * as babel from 'babel-core';
import *  as types from '../types';
import * as stopifyCallCC from '../stopify/stopifyCallCC';

/**
 * Compiles (i.e., "stopifies") a program. This function should not be used
 * directly by clients of Stopify.
 *
 * @param src the program to Stopify
 * @param opts compiler options
 * @returns the stopified program
 */
export function compile(src: string, opts: types.CompilerOpts): string {
  const babelOpts = {
    plugins: [[ stopifyCallCC.plugin, opts ]],
    babelrc: false,
    ast: false,
    code: true,
    minified: true,
    comments: false,
  };

  const { code } = babel.transform(src, babelOpts);
  return code!;
}
