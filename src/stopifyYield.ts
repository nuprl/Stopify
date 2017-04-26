import { Stoppable, stopify } from './stopifyInterface';
import * as noArrows from 'babel-plugin-transform-es2015-arrow-functions';
import * as desugarAndOr from './desugarAndOr';
import * as anf from './anf';
import * as yieldPass from './yield';
import { transform } from './helpers';

class YieldStopify implements Stoppable {
  private original: string;
  transformed: string;
  private isStop: () => boolean;
  private onStop: () => any;
  private interval: number;

  constructor (code: string,
    isStop: () => boolean,
    onStop: () => any,
    stop: () => void) {
      this.original = code;
      const plugins = [
        [noArrows, desugarAndOr], [anf], [yieldPass]
      ];
      this.transformed = transform(code, plugins);
      this.isStop = isStop;
      this.onStop = onStop;
      this.stop = stop;
      this.interval = 10;
    };

    setInterval(that): void {
      this.interval = that;
    }

    run(onDone: (any?) => any = x => x): void {
      const that = this;
      const $yieldCounter = this.interval;
      let $counter = 0;
      const $runYield = function run(gen,
        res = { done: false, value: undefined }) {
        setTimeout(_ => {
          if (that.isStop()) {
            that.onStop();
          }
          res = gen.next();
          if (res.done) {
            return onDone(res.value);
          }
          else {
            return run(gen, res);
          }
        }, 0)
      }
      eval(that.transformed);
    };

    stop(): void {
      return this.stop();
    }
};

const yieldStopify : stopify = function (code: string,
  isStop: () => boolean,
  onStop: () => any,
  stop: () => void): YieldStopify {
    return new YieldStopify(code, isStop, onStop, stop);
}

export {
    yieldStopify,
};
