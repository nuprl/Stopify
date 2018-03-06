import { Opts, AsyncRun } from '../types';
import { RuntimeInterface } from 'stopify-continuations/dist/src/runtime/abstractRuntime';
import { RuntimeWithSuspend } from './suspend';
import { makeEstimator } from './elapsedTimeEstimator';

export abstract class AbstractRunner implements AsyncRun {
  private suspendRTS: RuntimeWithSuspend;
  private onDone: () => void = function() { };
  private onYield: () => void = function() {  };
  private onBreakpoint: (line: number) => void = function() { };
  private breakpoints: number[] = [];
  private k: any;

  constructor(private continuationsRTS: RuntimeInterface, private opts: Opts) {
    const estimator = makeEstimator(this.opts);
    this.suspendRTS = new RuntimeWithSuspend(this.continuationsRTS,
      this.opts.yieldInterval, estimator);
    this.suspendRTS.mayYield = () => this.mayYieldRunning();
    this.suspendRTS.onYield = () => this.onYieldRunning();

  }

  mayYieldRunning(): boolean {
    const n = this.suspendRTS.rts.getLinenum();
    if (typeof n !== 'number') {
      return false;
    }
    return this.breakpoints.includes(n);
  }

  onYieldRunning() {
    if (this.mayYieldRunning()) {
      this.onBreakpoint(this.suspendRTS.rts.getLinenum()!);
      return false;
    }
    else {
      this.onYield();
      return true;
    }
  }

  /**
   * Called by the stopified program.
   */
  suspend() {
    return this.suspendRTS.suspend();
  }

  /**
   * Called by the stopfied program.
   */
  onEnd(): void {
    if (this.continuationsRTS.getDelimitDepth() === 1) {
      this.onDone();
    }
  }

  runInit(onDone: () => void,
    onYield?: () => void,
    onBreakpoint?: (line: number) => void) {
    if (onYield) {
      this.onYield = onYield;
    }
    if (onBreakpoint) {
      this.onBreakpoint = onBreakpoint;
    }
    this.onDone = onDone;
  }

  abstract run(onDone: () => void,
    onYield?: () => void,
    onBreakpoint?: (line: number) => void): void;

  pause(onPaused: (line?: number) => void) {
    this.suspendRTS.onYield = () => {
      this.suspendRTS.onYield = () => {
        this.onYield();
        return true;
      }
      const maybeLine = this.suspendRTS.rts.getLinenum();
      if (typeof maybeLine === 'number') {
        onPaused(maybeLine);
      }
      else {
        onPaused();
      }
      return false;
    }
  }

  setBreakpoints(lines: number[]): void {
    this.breakpoints = lines;
  }

  resume() {
    this.suspendRTS.mayYield = () => this.mayYieldRunning();
    this.suspendRTS.onYield = () => this.onYieldRunning();
    this.suspendRTS.resumeFromCaptured();
  }

  step(onStep: (line: number) => void) {
    const currentLine = this.suspendRTS.rts.getLinenum();
    // Yield control if the line number changes.
    const mayYield = () => {
      const n = this.suspendRTS.rts.getLinenum();
      if (typeof n !== 'number') {
        return false;
      }
      if (n !== currentLine) {
        onStep(n);
        return true;
      }
      else {
        return false;
      }
    };
    this.suspendRTS.mayYield = mayYield;
    // Pause if the line number changes.
    this.suspendRTS.onYield = () => !mayYield();
    this.suspendRTS.resumeFromCaptured();
  }

  pauseImmediate(callback: () => void): void {
    return this.continuationsRTS.captureCC((k) => {
      this.k = k;
      callback();
    });
  }

  continueImmediate(result: any): void {
    return this.continuationsRTS.runtime(() => this.k(result));
  }

}
