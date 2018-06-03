import { SourceMapConsumer, RawSourceMap } from 'source-map';
import { LineMapping } from '../types';
import * as convertSourceMap from 'convert-source-map';

class LineMappingImpl implements LineMapping {
  constructor(public getLine: (line: number, column: number) => number | null) {}
}

export function getSourceMap(jsCode: string): RawSourceMap | undefined {
  const mapConverter = convertSourceMap.fromSource(jsCode);
  if (mapConverter === null) {
    return;
  }
  return mapConverter.toObject() as RawSourceMap;
}

/**
 * Returns a custom line mapper which maps `node_modules` sources to `null`.
 */
export function generateLineMapping(map: RawSourceMap | undefined): LineMapping {
  if (map) {
    const sourceMap = new SourceMapConsumer(map);
    return new LineMappingImpl((line: number, column: number) => {
      const mapping = sourceMap.originalPositionFor({ line, column });
      // NOTE(arjun): Ignoring these directories is a bit of a hack
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
    return new LineMappingImpl((line: number, column: number) => line);
  }
}
