import * as babel from '@babel/core';
import * as t from '@babel/types';
import *  as types from '../types';
import * as stopifyCallCC from '../stopify/stopifyCallCC';
import * as parser from '@babel/parser';
import * as gen from '@babel/generator';
import * as normalizeJs from '@stopify/normalize-js';
/**
 * Compiles (i.e., "stopifies") a program. This function should not be used
 * directly by clients of Stopify.
 *
 * @param src the program to Stopify
 * @param opts compiler options
 * @returns the stopified program
 */
export function compileFromAst(
  src: t.File,
  opts: types.CompilerOpts): string {
  let args = { opts: opts };
  babel.traverse(src, stopifyCallCC.visitor, undefined as any, args);
  return gen.default(src).code!;
}

/**
 * Compiles (i.e., "stopifies") a program. This function should not be used
 * directly by clients of Stopify.
 *
 * @param src the program to Stopify
 * @param opts compiler options
 * @returns the stopified program
 */
export function compile(src: string, opts: types.CompilerOpts): string {
  return compileFromAst(parser.parse(src), opts);
}
