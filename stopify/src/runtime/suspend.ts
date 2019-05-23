import { setImmediate } from './setImmediate';
import { ElapsedTimeEstimator } from '@stopify/estimators';
import {  Runtime, Result } from '@stopify/continuations-runtime';

export function badResume(x: Result): any {
  throw new Error('program is not paused. (Did you call .resume() twice?)');
}

export function defaultDone(x: Result): any {
  if (x.type === 'exception') {
    console.error(x.value);
  }
}

const normalUndefResult: Result = { type: 'normal', value: undefined };

/**
 * Instance of a runtime extended with the suspend() function. Used by
 * instrumented programs produced by stopify.
 */
export class RuntimeWithSuspend {

  constructor(
    /**
     * Abstract runtime used to implement stack saving and restoring logic
     */
    public rts: Runtime,
    public yieldInterval: number,
    public estimator: ElapsedTimeEstimator,
    /** The runtime system yields control whenever this function produces
     * 'true' or when the estimated elapsed time exceeds 'yieldInterval'.
     */
    public mayYield = function(): boolean { return false; },
    /** This function is applied immediately before stopify yields control to
     *  the browser's event loop. If the function produces 'false', the
     *  computation does not resume.
     */
    public onYield = function(): boolean { return true; },
    /**
     * Called when execution reaches the end of any stopified module.
     */
    public onEnd = function (this: RuntimeWithSuspend, x: Result): void { this.estimator.cancel(); defaultDone(x); },
    public continuation = badResume,
    public onDone = defaultDone,
    /**
     * Current line number in the source program. Used in `--debug` mode.
     */
    public linenum: undefined | number = undefined) {
  }

  // Resume a suspended program.
  resumeFromCaptured(): any {
    const cont = this.continuation;
    const onDone = this.onDone;
    // Clear the saved continuation, or invoking .resumeFromCaptured() twice
    // in a row will restart the computation.
    this.continuation = badResume;
    this.onDone = defaultDone;
    return this.rts.runtime(() => cont(normalUndefResult), onDone);
  }

  /**
   * Call this function to suspend a running program. When called, it initiates
   * stack capturing by calling the `captureCC` function defined by the current
   * runtime.
   *
   * Internally uses stopify's timing mechanism to decide whether or not to
   * suspend.
   *
   * @param force forces a suspension when `true`.
   */
  suspend(force?: boolean): void {
    // If there are no more stack frame left to be consumed, save the stack
    // and continue running the program.
    if (isFinite(this.rts.stackSize) && this.rts.remainingStack <= 0) {
      this.rts.remainingStack = this.rts.stackSize;
      return this.rts.captureCC((continuation) => {
        if(this.onYield()) {
          return continuation(normalUndefResult);
        }
      });
    }

    if (force || this.mayYield() ||
        (this.estimator.elapsedTime() >= this.yieldInterval)) {

      if (isFinite(this.rts.stackSize)) {
        this.rts.remainingStack = this.rts.stackSize;
      }

      this.estimator.reset();
      return this.rts.captureCC((continuation) => {
        return this.rts.endTurn((onDone) => {
          this.continuation = continuation;
          this.onDone = onDone;
          if (this.onYield()) {
            return setImmediate(() => {
              this.rts.runtime(() => continuation(normalUndefResult), onDone);
            });
          }
        });
      });
    }
  }
}
