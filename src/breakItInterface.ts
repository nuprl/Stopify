export interface Breakable {
  run: (onDone: (any?) => any) => void;
  stop: (onStop: () => any) => void;
  setInterval: (number) => void;
  transformed: string
};

export type breakIt = (code: string,
    breakPoints: number[],
    onBreak: () => void) => Breakable;
