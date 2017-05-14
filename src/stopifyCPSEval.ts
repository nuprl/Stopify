const assert = require('assert');

import {Stoppable, stopify} from './stopifyInterface';

// Desugaring transforms.
const noArrows = require('babel-plugin-transform-es2015-arrow-functions');
import * as desugarLoop from './desugarLoop';
import * as desugarWhileToFunc from './desugarLoopToFunc';
import * as desugarLabel from './desugarLabel';
import * as desugarAndOr from './desugarAndOr';

// Call Expression naming transform.
import * as anf from './anf';

// CPS transforms.
import * as addKArg from './addContinuationArg';
import * as cps from './cpsVisitor';
import * as tagFree from './tagUnboundIds';
import * as kApply from './applyContinuation';
import * as applyStop from './stoppableApply';

// Helpers
import {transform} from './helpers';

type MaybeBound = {
    (...args: any[]): any,
    $isFree?: boolean,
}

class CPSStopify implements Stoppable {
  private original: string;
  transformed: string;
  private isStop: () => boolean;
  private onStop: () => any;
  private stopTarget: () => void
  private interval: number;

  constructor (code: string,
    isStop: () => boolean,
    stop: () => void) {
      this.original = code;
      const plugins = [
        [noArrows, desugarLoop, desugarLabel],
        [desugarWhileToFunc, desugarAndOr],
        [anf, addKArg, tagFree],
        [cps],
        [applyStop],
        [kApply],
      ];
      this.transformed = transform(code, plugins);

      if(this.transformed.length < code.length) {
        throw new Error('Transformed code is smaller than original code')
      }

      this.isStop = isStop;
      this.stopTarget = stop;
      this.interval = 10;
    };

  run(onDone: (arg?: any) => any): void {
    'use strict';
    const that = this;
    let counter = that.interval;
    let applyWithK = function (f: MaybeBound, k: any, ...args: any[]) {
      if (f.$isFree === undefined) {
        return f(k, ...args);
      } else {
        return k(f(...args));
      }
    };
    let apply = function (f: MaybeBound, k: any, ...args: any[]) {
      if (counter-- === 0) {
      counter = that.interval;
      setTimeout(_ => {
          if (that.isStop()) {
            that.onStop();
          } else {
            return applyWithK(f, k, ...args);
          }
        }, 0);
      } else {
        return applyWithK(f, k, ...args);
      }
    };
    eval(that.transformed);
  };

  stop(onStop: () => any): void {
    this.onStop = onStop;
    return this.stopTarget();
  };

  setInterval(n: number): void {
    this.interval = n;
  };
};

const cpsStopify : stopify = function (code: string,
  isStop: () => boolean,
  stop: () => void): CPSStopify {
    return new CPSStopify(code, isStop, stop);
}

export {
    cpsStopify,
};
