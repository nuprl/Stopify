import * as babel from 'babel-core';
export { plugin } from './stopify/stopifyCallCC';
import *  as types from './types';
export { compileFunction } from './stopify/compileFunction'
import * as smc from 'convert-source-map';
import { generateLineMapping } from './sourceMaps';
import { RawSourceMap } from 'source-map';
import { plugin as stopifyCallCC } from './stopify/stopifyCallCC';
import * as fs from 'fs-extra';
export { CompilerOpts, Opts } from './types';
import { pack }from 'stopify-continuations';
import * as tmp from 'tmp';
export { stopify as precompiledStopify } from './runtime/precompiled';

function mustWebPack(opts: types.CompilerOpts): boolean {
  return !opts.noWebpack && (opts.es === 'es5' || opts.hofs === 'fill');
}

function stopifyPack(srcPath: string, opts: types.CompilerOpts): Promise<string> {
  return new Promise((resolve, reject) => {
    const dstPath = tmp.fileSync({ postfix: '.js' }).name;
    pack(srcPath, dstPath, [stopifyCallCC, opts], err => {
      if (err !== null) {
        fs.removeSync(dstPath);
        return reject(err);
      }
      const jsCode = fs.readFileSync(dstPath, 'utf-8');
      fs.removeSync(dstPath);
      return resolve(jsCode);
    });
  });
}

export function stopify(srcPath: string, opts: types.CompilerOpts): Promise<string> {

  if (opts.captureMethod === 'original') {
    return fs.readFile(srcPath, 'utf-8');
  }
  mustWebPack(opts);
  if (mustWebPack(opts)) {
    return stopifyPack(srcPath, opts);
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

      opts.sourceMap = sourceMap;
      const babelOpts = {
        plugins: [[ stopifyCallCC, opts ]],
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
