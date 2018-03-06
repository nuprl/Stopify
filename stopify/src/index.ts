import *  as types from './types';
import * as smc from 'convert-source-map';
import * as fs from 'fs-extra';
import { generateLineMapping } from './sourceMaps';
import { RawSourceMap } from 'source-map';
import { compile } from './compiler/compiler';
export { compileFunction, compileEval } from './stopify/compileFunction'
export { CompilerOpts, Opts } from './types';
export { plugin } from './stopify/stopifyCallCC';

export function stopifySource(src: string, opts: types.CompilerOpts): Promise<string> {
  return new Promise((resolve, reject) =>
    resolve(compile(src, opts)));
}

export function stopify(srcPath: string, opts: types.CompilerOpts): Promise<string> {

  if (opts.captureMethod === 'original') {
    return fs.readFile(srcPath, 'utf-8').then((prog) => {
      return `${prog};window.originalOnDone();`
    })
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
        return stopifySource(src, opts);
      });
  }
}
