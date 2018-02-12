/**
 * `func` compile mode should be used when function bodies need to be compiled
 * while preserving the function signatures. This is currently being used in
 * the pyret compiler.
 *
 * This passes around information to make sure that:
 * - the function signature is preserved
 * - globals are not redeclared (since the input function might capture variables)
 */

import * as babel from 'babel-core';
import * as t from 'babel-types';
import * as callcc from 'stopify-continuations';
import { NodePath, Visitor } from 'babel-traverse';
import * as stopifyCallCC from './stopifyCallCC';
import * as assert from 'assert';

const visitor: Visitor = {
  Program(path: NodePath<t.Program>, { opts }) {
    path.stop()
    assert.equal(path.node.body.length, 1)
    const func = path.node.body[0]
    assert.equal(func.type, 'FunctionDeclaration',
      'Must compile a top-level function')
    callcc.transformFromAst(path, [[stopifyCallCC.plugin, opts]])
  }
}

const defaultOpts: callcc.CompilerOpts = {
    getters: false,
    compileFunction: true,
    debug: false,
    captureMethod: 'lazy',
    newMethod: 'wrapper',
    es: 'sane',
    hofs: 'builtin',
    jsArgs: 'simple',
    requireRuntime: false,
    noWebpack: true
}

export function compileFunction(
  code: string,
  opts: callcc.CompilerOpts = defaultOpts): string {
  const babelOpts = {
    plugins: [[() => ({ visitor }), opts]],
    babelrc: false
  };
  const { code:transformed } = babel.transform(code, babelOpts)
  if (!transformed) {
    throw new Error("Failed to transform function")
  }
  return transformed
}

export default function () {
  return { visitor };
}
