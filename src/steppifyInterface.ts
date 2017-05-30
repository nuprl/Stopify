export class LineMapping {
  getLine: (n: number | null) => number | null;

  constructor(func: (n: number | null) => number | null) {
    this.getLine = func;
  }
}

export interface Steppable {
  run: (onDone: (arg?: any) => any) => void;
  step: () => void;
  stop: (onStop: () => any) => void;
  setInterval: (n: number) => void;
  transformed: string
};

export type steppify = (code: string,
    breakPoints: number[],
    isStop: () => boolean,
    stop: () => any) => Steppable;
