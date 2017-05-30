import { Steppable, steppify } from './steppifyInterface';
const noArrows = require('babel-plugin-transform-es2015-arrow-functions');

import * as desugarAndOr from './desugarAndOr';
import * as desugarNew from './desugarNew';
import * as makeBlockStmt from './makeBlockStmt';
import * as yieldDebug from './yieldDebug';
import * as transformMarked from './transformMarked';
import { transformWithLines } from './helpers';
import * as markKnown from './markKnownFunctions'
import * as renameC from './renameConstructor'

class YieldSteppify implements Steppable {
  private original: string;
  private isStop: () => boolean;
  private interval: number;
  private stopTarget: () => void
  transformed: string;
  onStop: () => any;

  constructor (code: string, isStop: () => boolean, stop: () => void) {
    this.original = code;
    const plugins = [
      [noArrows, desugarNew, renameC], [makeBlockStmt], [markKnown], [yieldDebug],
      [transformMarked]
    ];
    this.transformed = transformWithLines(code, plugins, [])

    if(this.transformed.length < code.length) {
      throw new Error('Transformed code is smaller than original code')
    }

    this.isStop = isStop;
    const onStopDef = (function() { throw 'Execution terminated' })
    this.onStop = onStopDef
    this.stopTarget = stop;
    this.interval = 10;
  };

  step() {
    // TODO(rachit): Implement this.
  }

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
        if (res.value !== null) {
          console.log(res.value)
        }
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

const yieldSteppify : steppify = function (code: string,
  breakPoints: number[], isStop: () => boolean, stop: () => any) {
    return new YieldSteppify(code, isStop, stop);
};

(<any>yieldSteppify).isSteppify = true;

export {
    yieldSteppify,
};
