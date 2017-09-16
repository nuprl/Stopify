import { setImmediate } from '../setImmediate';
import { ElapsedTimeEstimator } from '../elapsedTimeEstimator';

// The type of continuation frames
export type KFrame = KFrameTop | KFrameRest;

export interface KFrameTop {
  kind: 'top';
  f: () => any;
}

export interface KFrameRest {
  kind: 'rest';
  f: () => any;   // The function we are in
  locals: any[];  // All locals and parameters
  index: number;  // At this application index
}

export type Stack = KFrame[];

// The type of execution mode, whether normally computing or restoring state
// from a captured `Stack`.
export type Mode = boolean;

// We throw this exception when a continuation value is applied. i.e.,
// captureCC applies its argument to a function that throws this exception.
export class Restore {
  constructor(public stack: Stack) {}
}

// We throw this exception to capture the current continuation. i.e.,
// captureCC throws this exception when it is applied. This class needs to be
// exported because source programs are instrumented to catch it.
export class Capture {
  constructor(public f: (k: any) => any, public stack: Stack) {}
}

export class Discard {
  constructor(public f: () => any) {}
}

interface RuntimeInterface {
  captureCC(f: (k: any) => any): void;
  // Wraps a stack in a function that throws an exception to discard the current
  // continuation. The exception carries the provided stack with a final frame
  // that returns the supplied value.
  makeCont(stack: Stack): (v: any) => any;
  runtime(body: () => any): any;
  handleNew(constr: any, ...args: any[]): any;
}

export abstract class Runtime {
  stack: Stack;
  mode: Mode;

  constructor(
    public yieldInterval: number,
    public estimator: ElapsedTimeEstimator,
    public capturing: boolean = false
    ) {
    this.stack = [];
    this.mode = true;
  }

  resume(result: any): any {
    return setImmediate(() => this.runtime(result));
  }

  suspend(top: any): void {
    // If this.yieldInterval is NaN, the condition will be false
    if (this.estimator.elapsedTime() >= this.yieldInterval) {
      this.estimator.reset();
      return this.captureCC(top);
    }
  }

  topK(f: () => any): KFrameTop {
    return {
      kind: 'top',
      f: () => {
        this.stack = [];
        this.mode = true;
        return f();
      }
    };
  }

  abstract captureCC(f: (k: any) => any): void;
  // Wraps a stack in a function that throws an exception to discard the current
  // continuation. The exception carries the provided stack with a final frame
  // that returns the supplied value.
  abstract makeCont(stack: Stack): (v: any) => any;
  abstract runtime(body: () => any): any;
  abstract handleNew(constr: any, ...args: any[]): any;
}

export const knownBuiltIns = [Object, Function, Boolean, Symbol, Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError, Number, Math, Date, String, RegExp, Array, Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, Map, Set, WeakMap, WeakSet, ArrayBuffer];
