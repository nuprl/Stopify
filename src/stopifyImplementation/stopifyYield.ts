import { Stoppable, stopify } from './stopifyInterface';
const noArrows = require('babel-plugin-transform-es2015-arrow-functions');

import * as desugarAndOr from '../desugarAndOr';
import * as desugarNew from '../desugarNew';
import * as makeBlockStmt from '../makeBlockStmt';
import * as yieldPass from '../yield';
import * as transformMarked from '../transformMarked';
import { transform } from '../helpers';
import * as markKnown from '../markKnownFunctions'
import * as renameC from '../renameConstructor'

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
      [noArrows, desugarNew, renameC], [makeBlockStmt], [markKnown], [yieldPass],
      [transformMarked]
    ];
    this.transformed = transform(code, plugins);

    if(this.transformed.length < code.length) {
      throw new Error('Transformed code is smaller than original code')
    }

    this.isStop = isStop;
    const onStopDef = (function() { throw 'Execution terminated' })
    this.onStop = onStopDef
    this.stopTarget = stop;
    this.interval = 10;
  };

  setInterval(that: number): void {
    this.interval = that;
  }

  run(onDone: (arg?: any) => any = x => x): void {
    const $that = this;
    const $yieldCounter = this.interval;
    let $counter = 0;
    const $runYield = function run(gen: Iterator<any>,
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
};

(<any>yieldStopify).isStopify = true;

export {
    yieldStopify,
};
