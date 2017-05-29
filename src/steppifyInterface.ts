export class MapLineMapping {
  getLine: (n: number | null) => number | null;

  constructor(map: Map<number, number>) {
    this.getLine = function(n: number | null) {
      if (n === null) return null;
      let ret = map.get(n);
      if (ret) {
        return ret;
      } else {
        throw new Error(`Did not find mapping for ${n}`)
      }
    }
  }
}

export class FunctionLineMapping {
  getLine: (n: number | null) => number | null;

  constructor(func: (n: number | null) => number | null) {
    this.getLine = func;
  }
}

export type LineMapping = MapLineMapping | FunctionLineMapping

export interface Steppable {
  run: (onDone: (arg?: any) => any) => void;
  stop: (onStop: () => any) => void;
  setInterval: (n: number) => void;
  transformed: string
};

export type steppify = (code: string,
    breakPoints: number[],
    onBreak: () => void) => Steppable;
