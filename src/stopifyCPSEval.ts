const assert = require('assert');

import {Stoppable, stopify} from './stopifyInterface';

// Desugaring transforms.
import * as noArrows from 'babel-plugin-transform-es2015-arrow-functions';
import * as desugarLoop from './desugarLoop';
import * as desugarWhileToFunc from './desugarLoopToFunc';
import * as desugarLabel from './desugarLabel';
import * as desugarAndOr from './desugarAndOr';

// Call Expression naming transform.
import * as anf from './anf';

// CPS transforms.
import * as addKArg from './addContinuationArg';
import * as cps from './cpsVisitor';
import * as kApply from './applyContinuation';
import * as applyStop from './stoppableApply';

// Helpers
import {transform} from './helpers';

class CPSStopify implements Stoppable {
  private original: string;
  transformed: string;
  private isStop: Function;
  private onStop: Function;
  private interval: number;

  constructor (code: string,
    isStop: () => boolean,
    onStop: () => any,
    stop: () => void) {
      this.original = code;
      const plugins = [
        [noArrows, desugarLoop, desugarLabel],
        [desugarWhileToFunc, desugarAndOr],
        [anf, addKArg],
        [cps],
        [applyStop],
        [kApply],
      ];
      this.transformed = transform(code, plugins);
      this.isStop = isStop;
      this.onStop = onStop;
      this.stop = stop;
      this.interval = 10;
    };

  run(onDone: (any?) => any): void {
    'use strict';
    const that = this;
    let counter = that.interval;
    let apply = function (f, k, ...args) {
        if (counter-- === 0) {
        counter = that.interval;
        setTimeout(_ => {
            if (that.isStop()) {
              that.onStop();
            } else {
              return f(k, ...args);
            }
          }, 0);
        } else {
          return f(k, ...args);
        }};
    eval(that.transformed);
  };

  stop(): void {
    return this.stop();
  };

  setInterval(n: number): void {
    this.interval = n;
  };
};

const cpsStopify : stopify = function (code: string,
  isStop: () => boolean,
  onStop: () => any,
  stop: () => void): CPSStopify {
    return new CPSStopify(code, isStop, onStop, stop);
}

export {
    cpsStopify,
};
