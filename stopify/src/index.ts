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

export function stopify(srcPath: string, opts: types.CompilerOpts): Promise<string> {

  if (opts.captureMethod === 'original') {
    return fs.readFile(srcPath, 'utf-8');
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