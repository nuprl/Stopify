import { Steppable, steppify } from './steppifyInterface';
const noArrows = require('babel-plugin-transform-es2015-arrow-functions');

import * as desugarAndOr from '../desugarAndOr';
import * as desugarNew from '../desugarNew';
import * as makeBlockStmt from '../makeBlockStmt';
import * as yieldDebug from '../yieldDebug';
import * as yieldRuntime from '../yieldRuntime';
import * as transformMarked from '../transformMarked';
import { transformWithLines } from '../helpers';
import * as markKnown from '../markKnownFunctions'
import * as renameC from '../renameConstructor'

class YieldSteppify implements Steppable {
  private original: string;
  private isStop: () => boolean;
  private stopTarget: () => void;
  private $currentState: Iterator<any>;
  transformed: string;
  onStop: () => any;
  onStep: (ln: number) => void;

  constructor (
    code: string,
    isStop: () => boolean,
    stop: () => void,
    onStep: (ln: number) => void) {
    this.isStop = isStop;
    const onStopDef = (function() { throw 'Execution terminated' })
    this.onStop = onStopDef
    this.stopTarget = stop;
    this.onStep = onStep;
    this.original = code;

    const plugins = [
      [noArrows, desugarNew, renameC], [makeBlockStmt], [markKnown], [yieldDebug],
      [transformMarked, yieldRuntime]
    ];
    this.transformed = transformWithLines(code, plugins, [])

    /* Eval the code with $that set to `this` and set the $currentState
     * property to be the top level generator function produced by the
     * yield transform.
     */
    const $that = this
    eval(this.transformed)

  };

  /* NOTE(rachit): `runToCompletion` basially implies that `step` was called
   * through `run`.
   */
  step(onDone: () => void, runToCompletion: boolean = false) {
    const res = this.$currentState.next()
    if (runToCompletion && this.isStop()) {
      return this.onStop();
    }
    if (!res.done) {
      if(runToCompletion) {
        setTimeout(_ => {
          return this.step(onDone, runToCompletion)
        }, 0)
      } else if(res.value === null || res.value - 1 === 0) {
        setTimeout(_ => {
          return this.step(onDone, runToCompletion)
        }, 0)
      } else {
        return this.onStep(res.value - 1)
      }
    } else {
      return onDone();
    }
  }

  run(onDone: () => void = () => console.log('Complete Execution')): void {
    return this.step(onDone, true)
  };

  stop(onStop: () => any): void {
    // TODO(rachit): Multiple calls to stop before stop is actually registered
    // will override the first one. Make sure that this doesn't happen.
    this.onStop = onStop;
    this.stopTarget();
  }
};

const yieldSteppify : steppify = function (code: string,
  breakPoints: number[],
  isStop: () => boolean,
  stop: () => any,
  onStep: (ln: number) => void) {
    return new YieldSteppify(code, isStop, stop, onStep);
};

(<any>yieldSteppify).isSteppify = true;

export {
    yieldSteppify,
};
