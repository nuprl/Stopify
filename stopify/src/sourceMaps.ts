import { RawSourceMap, SourceMapConsumer } from "source-map";

export class LineMapping {
  constructor(public getLine: (line: number, column: number) => number | null) {}
}

/**
 * Returns a custom line mapper which maps `node_modules` sources to `null`.
 */
export function generateLineMapping(map: RawSourceMap | undefined): LineMapping {
  if (map) {
    const sourceMap = new SourceMapConsumer(map);
    return new LineMapping((line: number, column: number) => {
      const mapping = sourceMap.originalPositionFor({ line, column });
      if (mapping.source === null ||
        mapping.source.includes("node_modules/") ||
        mapping.source.includes("https://") ||
        mapping.source.includes("goog/") ||
        mapping.source.includes("cljs/") ||
        mapping.source.includes("opt/") ||
        mapping.source.includes("user_code/") ||
        mapping.line === null) {
        return null;
      } else {
        return mapping.line;
      }
    });
  } else {
    console.log("// No mapping found, using one-to-one map");
    return new LineMapping((line: number, column: number) => line);
  }
}
