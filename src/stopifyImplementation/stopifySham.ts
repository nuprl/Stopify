import { Stoppable, stopify } from './stopifyInterface';

class Sham implements Stoppable {
  transformed: string;

  constructor(code: string) {
    this.transformed = code;
  }

  run(onDone: (arg?: any) => any) {
    onDone(eval(this.transformed));
  }

  stop(onStop: () => any) {
    onStop();
  }
  setInterval(n: number) {
  }
}

export function shamStopify(
  code: string,
  isStop: () => boolean,
  stop: () => void): Stoppable {
  return new Sham(code);
}
