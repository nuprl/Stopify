export interface Stoppable {
  run: (onDone: (arg?: any) => any) => void;
  stop: (onStop: () => any) => void;
  setInterval: (n: number) => void;
  transformed: string
}

export type stopify = (code: string,
    isStop: () => boolean,
    stop: () => any) => Stoppable;

export function isStopify(func: any): func is stopify {
  return func.isStopify !== undefined;
}
