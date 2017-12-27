import * as babel from 'babel-core';
export { plugin } from './stopify/stopifyCallCC';
import *  as types from './types';
export { compileFunction } from './stopify/compileFunction'
import * as smc from 'convert-source-map';
import { generateLineMapping, LineMapping } from './sourceMaps';
import { SourceMapConsumer, RawSourceMap } from 'source-map';
import { plugin as stopifyCallCC } from './stopify/stopifyCallCC';
import * as fs from 'fs-extra';
export { CompilerOpts } from './types';
import * as rts from './runtime/rts';
export { rts };

export function stopify(srcPath: string, opts: types.CompilerOpts): Promise<string> {

  if (opts.transform === 'original') {
    return fs.readFile(srcPath, 'utf-8');
  }
  if (opts.debug === undefined) {
    opts.debug = false;
  }
  if (opts.transform === undefined) {
    opts.transform = 'lazy';
  }
  if (opts.newMethod === undefined) {
    opts.newMethod = 'wrapper';
  }
  if (opts.es === undefined) {
    opts.es = 'sane';
  }
  if (opts.hofs === undefined) {
    opts.hofs = 'builtin';
  }
  if (opts.jsArgs === undefined) {
    opts.jsArgs = 'simple';
  }
  if (opts.requireRuntime === undefined) {
    opts.requireRuntime = false;
  }

  return fs.readFile(srcPath, 'utf-8')
    .then(src => {
      if (!opts.debug) {
        return { src: src, sourceMap: undefined };
      }
      const mapConverter = smc.fromSource(src)!;
      const map = mapConverter ? mapConverter.toObject() : null;
      return { src: src, sourceMap: generateLineMapping(<RawSourceMap>map) };
    })
    .then(({src, sourceMap}) => {
      const plugin: any = [
        stopifyCallCC,
        {
          captureMethod: opts.transform,
          handleNew: opts.newMethod,
          esMode: opts.es,
          hofs: opts.hofs,
          debug: opts.debug,
          jsArgs: opts.jsArgs,
          sourceMap: sourceMap,
          requireRuntime: opts.requireRuntime
        }
      ];

      const babelOpts = {
        plugins: [plugin],
        babelrc: false,
        ast: false,
        code: true,
        minified: true,
        comments: false,
      };

      return new Promise((resolve, reject) =>
        babel.transformFile(srcPath, babelOpts, (err, result) => {
          if (err !== null) {
            return reject(err);
          }
          const { code } = result;
          return resolve(code!);
        }));
      });

}