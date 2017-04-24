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
  private cps: string;
  private isStop: Function;
  private onStop: Function;

  constructor (code: string,
    isStop: () => boolean,
    onStop: () => any,
    stop: () => void) {
      this.original = code;
      const plugins = [
        [noArrows, desugarLoop, desugarWhileToFunc, desugarLabel, desugarAndOr],
        [anf, addKArg],
        [cps],
        [kApply],
        [applyStop],
      ];
      this.cps = transform(code, plugins);
      this.isStop = isStop;
      this.onStop = onStop;
      this.stop = stop;
    };

  run(): void {
    const that = this;
    let apply = function (f, k, ...args) {
        setTimeout(_ => {
            if (that.isStop()) {
              that.onStop();
            } else {
              return f(k, ...args);
            }
          }, 0);
        };
    eval(that.cps);
  };

  stop(): void {
    return this.stop();
  }
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
