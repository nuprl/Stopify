import *  as types from './types';
import * as smc from 'convert-source-map';
import { generateLineMapping } from './sourceMaps';
import { RawSourceMap } from 'source-map';
import { compile } from './compiler/compiler';
export { compileFunction, compileEval } from './stopify/compileFunction';
export { CompilerOpts, RuntimeOpts } from './types';
import { checkAndFillCompilerOpts } from 'stopify-continuations/dist/src/compiler/check-compiler-opts';

export function stopify(src: string,
  opts: Partial<types.CompilerOpts>): string {
  const filledOpts = checkAndFillCompilerOpts(opts);

  if (filledOpts.captureMethod === 'original') {
    return `${src};window.originalOnDone();`;
  }
  else {
    if (filledOpts.debug) {
      const mapConverter = smc.fromSource(src)!;
      filledOpts.sourceMap = generateLineMapping(
        (mapConverter ? mapConverter.toObject() : null) as RawSourceMap);
    }
    return compile(src, filledOpts);
  }
}
