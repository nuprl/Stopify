import { Opts, AsyncRun } from '../types';
import { Runtime } from 'stopify-continuations/dist/src/runtime/abstractRuntime';
import { RuntimeWithSuspend } from './suspend';
import { makeEstimator } from './elapsedTimeEstimator';

// We need to provide these for stopify-continuations
export * from 'stopify-continuations/dist/src/runtime/runtime';

// For testing / benchmarking convenience.
export { parseRuntimeOpts } from '../cli-parse';

let runner : Runner | undefined;

class Runner implements AsyncRun {
  private continuationsRTS: Runtime;
  private suspendRTS: RuntimeWithSuspend;
  private onDone: () => void = function() { };
  private onYield: () => void = function() {  };

  constructor(private url: string, private opts: Opts) { }

  /**
   * Indirectly called by the stopified program.
   */
  init(rts: Runtime) {
    this.continuationsRTS = rts;
    const estimator = makeEstimator(this.opts);
    this.suspendRTS = new RuntimeWithSuspend(this.continuationsRTS,
      this.opts.yieldInterval, estimator);
    this.suspendRTS.onYield = () => {
      this.onYield(); 
      return true; 
    }
    return this;
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
    this.onDone();
  }

  run(onDone: () => void, onYield?: () => void) {
    if (onYield) {
      this.onYield = onYield;
    }
    this.onDone = onDone;
    const script = document.createElement('script');
    script.setAttribute('src', this.url);
    document.body.appendChild(script);
  }

  pause(onPaused: () => void) {
    this.suspendRTS.onYield = () => {
      this.suspendRTS.onYield = () => {
        this.onYield();
        return true;
      }
      onPaused();
      return false;
    }
  }

  resume() {
    this.suspendRTS.resumeFromCaptured();
  }

}

/**
 * Called by the stopified program to get suspend() and other functions.
 */
export function init(rts: Runtime): AsyncRun {
  if (runner === undefined) {
    throw new Error('stopify not called');
  }
  return runner.init(rts);
}

/**
 * Control the execution of a pre-compiled program.
 *
 * @param url URL of a pre-compiled program
 * @param opts runtime settings
 */
export function stopify(url: string, opts: Opts): AsyncRun {
  runner = new Runner(url, opts);
  return runner;
}