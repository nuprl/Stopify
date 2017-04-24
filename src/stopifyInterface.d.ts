export interface Stoppable {
  run: () => void;
  stop: () => void;
  setInterval: (number) => void;
}

export type stopify = (code: string,
    isStop: () => boolean,
    onStop: () => any,
    stop: () => void) => Stoppable;
