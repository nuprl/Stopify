export interface Stoppable {
  run: (onDone: (any?) => any) => void;
  stop: (onStop: () => any) => void;
  setInterval: (number) => void;
  transformed: string
}

export type stopify = (code: string,
    isStop: () => boolean,
    onStop: () => any) => Stoppable;
