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
        [cps, applyStop, transformMarked, cpsRuntime],
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
