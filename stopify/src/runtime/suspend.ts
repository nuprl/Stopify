import { setImmediate } from './setImmediate';
import { ElapsedTimeEstimator } from './elapsedTimeEstimator';
import { unreachable } from '../generic';
import * as assert from 'assert';
import {  Runtime } from 'stopify-continuations/dist/src/runtime';


export class RuntimeWithSuspend {
  breakpoints: number[];

  constructor(
    public rts: Runtime,
    public yieldInterval: number,
    public estimator: ElapsedTimeEstimator,
    /** This function is applied immediately before stopify yields control to
     *  the browser's event loop. If the function produces 'false', the
     *  computation terminates.
     */
    public onYield = function(): boolean { return true; },
    /**
      Called when execution reaches the end of any stopified module.
     */
    public onEnd = function() { },
    public continuation = function() {}  ) {
  }

  resumeFromCaptured(): any {
    this.rts.resumeFromSuspension(this.continuation);
  }

  suspend(): void {
    assert(!this.rts.isSuspended);
    // Do not suspend at the top-level of required modules.
    if (this.rts.delimitDepth > 1) {
      return;
    }
    // If this.yieldInterval is NaN, the condition will be false
    if (this.hitBreakpoint() ||
      this.estimator.elapsedTime() >= this.yieldInterval) {
      this.estimator.reset();
      this.rts.isSuspended = true;
      return this.rts.captureCC((continuation) => {
        this.continuation = continuation;

        if (this.onYield()) {
          return setImmediate(() => {
            this.rts.resumeFromSuspension(continuation);
          });
        }
      });
    }
  }

  setBreakpoints(breaks: number[]): void {
    this.breakpoints = breaks;
  }

  hitBreakpoint(): boolean {
    return this.breakpoints && this.breakpoints.includes(<number>this.rts.linenum);
  }

}
