import {Stoppable, stopify} from './stopifyInterface';

// Desugaring transforms.
const noArrows = require('babel-plugin-transform-es2015-arrow-functions');
import * as desugarLoop from '../desugarLoop';
import * as desugarFunctionDecl from '../desugarFunctionDecl';
import * as desugarNew from '../desugarNew';
import * as desugarSwitch from '../desugarSwitch';
import * as desugarWhileToFunc from '../desugarLoopToFunc';
import * as desugarLabel from '../desugarLabel';
import * as trampolineApply from '../trampolineApply';

// Call Expression naming transform.
import * as makeBlockStmt from '../makeBlockStmt';

// CPS transforms.
import * as addKArg from '../addContinuationArg';
import * as cps from '../cpsSyntax';
import * as applyStop from '../stoppableApply';
import * as cpsRuntime from '../cpsRuntime';

import * as transformMarked from '../transformMarked';

// Helpers
import {transform} from '../helpers';

type MaybeBound = {
  (...args: any[]): any,
  $isTransformed?: boolean,
}

function onError(arg?: any) {
  throw new Error(`Unexpected error: ${arg}`);
};

function applyWithK(f: MaybeBound, k: any, ek: any, ...args: any[]) {
  if (f.$isTransformed) {
    return f(k, ek, ...args);
  } else {
    try {
      return k(f(...args));
    } catch (e) {
      return ek(e);
    }
  }
};

function call_applyWithK(f: MaybeBound, k: any, ek: any, ...args: any[]) {
  const [hd, ...tail] = args;
  if (f.$isTransformed) {
    return f.call(hd, k, ek, ...tail);
  } else {
    try {
      return k(f.call(hd, ...tail));
    } catch (e) {
      return ek(e);
    }
  }
};

function apply_applyWithK(f: MaybeBound, k: any, ek: any, thisArg: any, args: any[]) {
  if (f.$isTransformed) {
    return f.apply(thisArg, [k, ek, ...args]);
  } else {
    try {
      return k(f.apply(thisArg, args));
    } catch (e) {
      return ek(e);
    }
  }
};

class TrampolinedCPSStopify implements Stoppable {
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
        [noArrows, desugarLoop, desugarLabel, desugarFunctionDecl, desugarNew],
        [desugarSwitch, desugarWhileToFunc],
        [makeBlockStmt, addKArg],
        [cps, applyStop, trampolineApply, transformMarked, cpsRuntime],
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

    function $runTrampolined(f: any) {
      while(f && f.tramp) {
        if(counter-- === 0) {
          counter = that.interval
          setTimeout(_ => {
            if(that.isStop()) {
              that.onStop();
            } else {
              return $runTrampolined(f)
            }
          }, 0)
          break;
        } else {
          f = f.f()
        }
      }
    }

    let apply_helper = function (how: any) {
      return function (f: MaybeBound, k: any, ek: any, ...args: any[]) {
        return how(f, k, ek, ...args);
      };
    };
    let admin_apply = apply_helper(function (f: MaybeBound, ...args: any[]) {
      return f(...args);
    });
    let apply = apply_helper(function (f: MaybeBound, k: any, ek: any, ...args: any[]) {
      return applyWithK(f, k, ek, ...args);
    });
    let call_apply = apply_helper(function (f: MaybeBound, k: any, ek: any, ...args: any[]) {
      return call_applyWithK(f, k, ek, ...args);
    });
    let apply_apply = apply_helper(function (f: MaybeBound,
      k: any,
      ek: any,
      thisArg: any,
      args: any[]) {
      return apply_applyWithK(f, k, ek, thisArg, args);
    });

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

const trampolinedCpsStopify : stopify = function (code: string,
  isStop: () => boolean,
  stop: () => void): TrampolinedCPSStopify {
    return new TrampolinedCPSStopify(code, isStop, stop);
};

(<any>trampolinedCpsStopify).isStopify = true;

export {
    trampolinedCpsStopify,
};
