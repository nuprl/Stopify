import * as babel from 'babel-core';
import * as t from 'babel-types';
import * as h from '../common/helpers';
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
    h.transformFromAst(path, [[stopifyCallCC.plugin, opts]])
  }
}

type Opts = {
  handleNew: 'direct' | 'wrapper',
  captureMethod: 'eager' | 'retval' | 'lazy'
}

export function compileFunction(code: string, opts: Opts): string {
  const babelOpts = {
    plugins: [[() => ({ visitor }), {
      ...opts,
      compileFunction: true
    }]],
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
