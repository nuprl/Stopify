import { SourceMapConsumer, RawSourceMap } from 'source-map';
import * as smc from 'convert-source-map';

export class LineMapping {
  constructor(public getLine: (line: number, column: number) => number | null) {}
}

/**
 * Returns a custom line mapper which maps `node_modules` sources to `null`.
 */
export function generateLineMapping(map: RawSourceMap | undefined): LineMapping {
  if (map) {
    console.log('// Mapping found');
    const sourceMap = new SourceMapConsumer(map);
    return new LineMapping((line: number, column: number) => {
      const mapping = sourceMap.originalPositionFor({ line, column });
      if (mapping.source === null ||
        mapping.source.includes('node_modules/') ||
        mapping.source.includes('https://') ||
        mapping.source.includes('goog/') ||
        mapping.source.includes('cljs/') ||
        mapping.source.includes('opt/') ||
        mapping.source.includes('user_code/') ||
        mapping.line === null) {
        return null;
      } else {
        return mapping.line;
      }
    });
  } else {
    console.log('// No mapping found, using one-to-one map');
    return new LineMapping((line: number, column: number) => line);
  }
}

function parseMapping(code: string) {
  const mapConverter = smc.fromSource(code);
  // No match
  if (mapConverter === null) {
    return generateLineMapping(undefined);
  } else {
    return generateLineMapping(mapConverter.toObject());
  }
}