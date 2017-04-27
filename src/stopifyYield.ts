import { Stoppable, stopify } from './stopifyInterface';
import * as noArrows from 'babel-plugin-transform-es2015-arrow-functions';
import * as desugarAndOr from './desugarAndOr';
import * as anf from './anf';
import * as yieldPass from './yield';
import { transform } from './helpers';

class YieldStopify implements Stoppable {
  private original: string;
  private isStop: () => boolean;
  private interval: number;
  private stopTarget: () => void
  transformed: string;
  onStop: () => any;

  constructor (code: string, isStop: () => boolean, stop: () => void) {
    this.original = code;
    const plugins = [
      [noArrows, desugarAndOr], [anf], [yieldPass]
    ];
    this.transformed = transform(code, plugins);

    this.isStop = isStop;
    const onStopDef = (function() { throw 'Execution terminated' })
    this.onStop = onStopDef
    this.stopTarget = stop;
    this.interval = 10;
  };

  setInterval(that): void {
    this.interval = that;
  }

  run(onDone: (any?) => any = x => x): void {
    const $that = this;
    const $yieldCounter = this.interval;
    let $counter = 0;
    const $runYield = function run(gen,
      res = { done: false, value: undefined }) {
      setTimeout(_ => {
        if ($that.isStop()) {
          return $that.onStop();
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
    eval($that.transformed);
  };

  stop(onStop: () => any): void {
    // TODO(rachit): Multiple calls to stop before stop is actually registered
    // will override the first one. Make sure that this doesn't happen.
    this.onStop = onStop;
    this.stopTarget();
  }
};

const yieldStopify : stopify = function (code: string,
  isStop: () => boolean,
  stop: () => void): YieldStopify {
    return new YieldStopify(code, isStop, stop);
}

export {
    yieldStopify,
};
