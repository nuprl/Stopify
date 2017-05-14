export interface Breakable {
  run: (onDone: (arg?: any) => any) => void;
  stop: (onStop: () => any) => void;
  setInterval: (n: number) => void;
  transformed: string
};

export type breakIt = (code: string,
    breakPoints: number[],
    onBreak: () => void) => Breakable;
