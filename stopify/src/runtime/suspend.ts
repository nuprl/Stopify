import * as assert from "assert";
import {  Runtime } from "stopify-continuations/dist/src/runtime";
import { ElapsedTimeEstimator } from "./elapsedTimeEstimator";
import { setImmediate } from "./setImmediate";

export class RuntimeWithSuspend {

  constructor(
    public rts: Runtime,
    public yieldInterval: number,
    public estimator: ElapsedTimeEstimator,
    /** The runtime system yields control whenever this function produces
     * 'true' or when the estimated elapsed time exceeds 'yieldInterval'.
     */
    public mayYield = function(): boolean { return false; },
    /** This function is applied immediately before stopify yields control to
     *  the browser's event loop. If the function produces 'false', the
     *  computation terminates.
     */
    public onYield = function(): boolean { return true; },
    /**
     * Called when execution reaches the end of any stopified module.
     */
    public onEnd = function() { return; },
    public continuation = function() { return; }  ) {
  }

  public resumeFromCaptured(): any {
    this.rts.resumeFromSuspension(this.continuation);
  }

  public suspend(): void {
    // FOR DEBUGGING
    // if (this.rts.isSuspended) { debugger; }
    assert(!this.rts.isSuspended, "already suspended");
    // Do not suspend at the top-level of required modules.
    if (this.rts.delimitDepth > 1) {
      return;
    }
    // If this.yieldInterval is NaN, the condition will be false
    if (this.mayYield() || this.estimator.elapsedTime() >= this.yieldInterval) {
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
}
