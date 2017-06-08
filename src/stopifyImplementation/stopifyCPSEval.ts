import {Stoppable, stopify} from './stopifyInterface';

// Desugaring transforms.
const noArrows = require('babel-plugin-transform-es2015-arrow-functions');
import * as desugarLoop from '../desugarLoop';
import * as desugarFunctionDecl from '../desugarFunctionDecl';
import * as desugarNew from '../desugarNew';
import * as desugarSwitch from '../desugarSwitch';
import * as desugarWhileToFunc from '../desugarLoopToFunc';
import * as desugarLabel from '../desugarLabel';
import * as liftVar from '../liftVar';
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
        [desugarFunctionDecl, liftVar, noArrows, desugarLoop, desugarLabel, desugarNew],
        [desugarSwitch, desugarWhileToFunc],
        [makeBlockStmt, addKArg],
        [cps, applyStop, transformMarked],
      ];
    const cpsHelpers = `
"use strict";

let that = this;
let counter = that.interval;

function $mark_func(f) {
  f.$isTransformed = true;
  f.call = f.call.bind(f);
  f.call.$isTransformed = true;
  f.apply = f.apply.bind(f);
  f.apply.$isTransformed = true;
  Object.defineProperty(f, "length", {
    configurable: true,
    value: f.length - 2
  });
  return f;
}

function onError(arg) {
  throw new Error('Unexpected error: ' + arg);
}

function applyWithK(f, k, ek, ...args) {
  if (f.$isTransformed) return f(k, ek, ...args);else try {
    return k(f(...args));
  } catch (e) {
    return ek(e);
  }
}

function call_applyWithK(f, k, ek, ...args) {
  const [hd, ...tail] = args;
  if (f.$isTransformed) return f.call(hd, k, ek, ...tail);else try {
    return k(f.call(hd, ...tail));
  } catch (e) {
    return ek(e);
  }
}

function apply_applyWithK(f, k, ek, thisArg, args) {
  if (f.$isTransformed) return f.apply(thisArg, [k, ek, ...args]);else try {
    return k(f.apply(thisArg, args));
  } catch (e) {
    return ek(e);
  }
}

function apply_helper(how) {
  return function (f, k, ek, ...args) {
    if (counter-- === 0) {
      counter = that.interval;
      setTimeout(_ => {
        if (that.isStop()) that.onStop();else return how(f, k, ek, ...args);
      }, 0);
    } else return how(f, k, ek, ...args);
  };
}

const admin_apply = apply_helper(function (f, ...args) {
  return f(...args);
});
const apply = apply_helper(function (f, k, ek, ...args) {
  return applyWithK(f, k, ek, ...args);
});
const call_apply = apply_helper(function (f, k, ek, ...args) {
  return call_applyWithK(f, k, ek, ...args);
});
const apply_apply = apply_helper(function (f, k, ek, thisArg, args) {
  return apply_applyWithK(f, k, ek, thisArg, args);
});

    `;
      this.transformed = cpsHelpers + transform(code, plugins);

      if(this.transformed.length < code.length) {
        throw new Error('Transformed code is smaller than original code')
      }

      this.isStop = isStop;
      this.stopTarget = stop;
      this.interval = 10;
    };

  run(onDone: (arg?: any) => any): void {
    eval(this.transformed);
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
};

(<any>cpsStopify).isStopify = true;

export {
    cpsStopify,
};
