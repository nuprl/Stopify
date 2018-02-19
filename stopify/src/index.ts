import * as babel from 'babel-core';
import *  as types from './types';
import * as smc from 'convert-source-map';
import { generateLineMapping } from './sourceMaps';
import { RawSourceMap } from 'source-map';
import { plugin as stopifyCallCC } from './stopify/stopifyCallCC';
import * as fs from 'fs-extra';
import { pack }from 'stopify-continuations';
import * as tmp from 'tmp';

export { CompilerOpts, Opts } from './types';
export { compileFunction } from './stopify/compileFunction'
export { stopify as precompiledStopify } from './runtime/precompiled';
export { plugin } from './stopify/stopifyCallCC';

function mustWebPack(opts: types.CompilerOpts): boolean {
  return !opts.noWebpack &&
    (opts.es === 'es5' || opts.hofs === 'fill' || opts.getters)
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
    return fs.readFile(srcPath, 'utf-8').then((prog) => {
      // If the program is running with loader.bundle.js, call the onDone
      // callback.
      return `${prog};\n${opts.noWebpack ? "" :  "window.originalOnDone();"}`
    })
  }
  else if (mustWebPack(opts)) {
    return stopifyPack(srcPath, opts);
  }
  else {
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
          minified: false,
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
}
