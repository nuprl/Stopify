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
import * as stopifyCallCC from './stopifyCallCC';
import * as assert from 'assert';
import { NodePath, Visitor } from 'babel-traverse';

const visitor: Visitor = {
  Program: {
    enter(path: NodePath<t.Program>, { opts }) {
      path.stop();
      assert.equal(path.node.body.length, 1);
      const func = path.node.body[0];
      if (func.type !== 'FunctionDeclaration') {
        throw new Error('Must compile a top-level function');
      }

      else {
        // If compile a string to be eval'd, convert last statement to a return
        // statement
        if (opts.eval) {
          const lastStatement = (<t.FunctionDeclaration>func).body.body.pop()!;

          if (lastStatement.type === 'ExpressionStatement') {
            func.body.body.push(t.returnStatement(lastStatement.expression));
          }
          else {
            func.body.body.push(lastStatement);
          }
        }

      }

      callcc.transformFromAst(path, [[stopifyCallCC.plugin, opts]]);
    }
  }
};

// TODO(arjun): hand-coded in default externals. These should be picked up
// from the runtime.
const defaultExternals = [
  "Object",
  "exports",
  "require",
  "console",
  "global",
  "window",
  "document",
  "process",
  "setTimeout",
  "captureCC",
];

const defaultOpts: callcc.CompilerOpts = {
    getters: false,
    compileFunction: true,
    debug: false,
    captureMethod: 'lazy',
    newMethod: 'wrapper',
    eval: false,
    es: 'sane',
    hofs: 'builtin',
    jsArgs: 'simple',
    requireRuntime: false,
    externals: defaultExternals
};

export function compileFunction(
  code: string,
  opts: callcc.CompilerOpts = defaultOpts): string {
  const babelOpts = {
    plugins: [[() => ({ visitor }), opts]],
    babelrc: false
  };
  const { code:transformed } = babel.transform(code, babelOpts);
  if (!transformed) {
    throw new Error("Failed to transform function");
  }
  return transformed;
}

export function compileEval(code: string, type: string, renames: { [key: string]: string }, boxes: string[]): string {
  // `any` needed because of the extra renames and boxes fields.
  const opts: any = {
    compileFunction: true,
    getters: true,
    debug: false,
    captureMethod: type,
    newMethod: 'wrapper',
    eval: true,
    es: 'es5',
    hofs: 'fill',
    jsArgs: 'full',
    requireRuntime: (typeof window === 'undefined'),
    externals: defaultExternals,
    renames,
    boxes
  };

  const toCompile = `function __eval__function() { ${code} }`;
  const transformed = compileFunction(toCompile, opts);
  return `(${transformed!})()`;
}

export default function () {
  return { visitor };
}
