import * as babel from 'babel-core';
import *  as types from './types';
import * as smc from 'convert-source-map';
import * as fs from 'fs-extra';
import { generateLineMapping } from './sourceMaps';
import { RawSourceMap } from 'source-map';
import { plugin as stopifyCallCC } from './stopify/stopifyCallCC';

export { CompilerOpts, RuntimeOpts } from './types';
export { compileFunction } from './stopify/compileFunction'
export { stopify as precompiledStopify } from './runtime/precompiled';
export { plugin } from './stopify/stopifyCallCC';


export function stopifySourceSync(src: string, opts: types.CompilerOpts): string {
  const babelOpts = {
    plugins: [[ stopifyCallCC, opts ]],
    babelrc: false,
    ast: false,
    code: true,
    minified: true,
    comments: false,
  };

  const { code } = babel.transform(src, babelOpts);
  return code!;
}

export function stopifySource(src: string, opts: types.CompilerOpts): Promise<string> {
  return new Promise((resolve, reject) =>
    resolve(stopifySourceSync(src, opts)));
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
