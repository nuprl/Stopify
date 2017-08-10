import { setImmediate } from '../setImmediate';

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
export type Mode = 'normal' | 'restoring';

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

type Constructor<T> = new(...args: any[]) => T;

type RTS = Constructor<RuntimeInterface>

function geom(p: number): number { 
  return Math.ceil(Math.log(1 - Math.random()) / Math.log(1 - p)); 
}

class ReservoirSampleTime {
  private i: number;
  private countDown: number;
  private countDownFrom: number;
  private sample: (t: number, ticks: number) => void;

  constructor(sample: (t: number, ticks: number) => void) {
    this.i = 1;
    this.countDownFrom = geom(1 / this.i);
    this.countDown = this.countDownFrom;
    this.sample = sample;
    sample(Date.now(), 1);
  }

  tick() {
    this.i = (this.i + 1) | 0;
    if (this.countDown-- === 0) {
      this.sample(Date.now(), this.countDownFrom);
      this.countDownFrom = geom(1 / this.i);
      this.countDown = this.countDownFrom;
    }
  }
}

export const Latency = <T extends RTS>(Base: T) => class extends Base {
  latency: number;
  lastTime: number;
  ticksBetweenYields: number;
  nextYield: number;
  sampler: ReservoirSampleTime;

  constructor( ...args: any[]) {
    super(...args);
    this.sampler = new ReservoirSampleTime((now, ticks) => {
      this.ticksBetweenYields = Math.floor(ticks / (now - this.lastTime) * this.latency);
      if (!isFinite(this.ticksBetweenYields)) {
        this.ticksBetweenYields = 100;
      }
      this.lastTime = now;
    });
    this.nextYield = this.ticksBetweenYields;
  }

  setLatency(latency: number) {
    this.latency = latency;
  }

  resume(result: any): any {
    return setImmediate(() => this.runtime(result));
  }

  suspend(top: any): void {
    this.sampler.tick();
    if (--this.nextYield <= 0) {
      this.nextYield = this.ticksBetweenYields;
      return this.captureCC(top);
    }
  }
  
}

// This is a mixin:
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html
export const YieldInterval = <T extends RTS>(Base: T) =>
  class extends Base {
   interval: number;
   countDown: number;
   constructor( ...args: any[]) {
      super(...args);
    }
    
    setInterval(interval: number) {
      this.interval = interval;
      this.countDown = interval;
    }      

    resume(result: any): any {
      return setImmediate(() => this.runtime(result));
    }

    suspend(top: any): void {
      if (Number.isNaN(this.interval)) {
        return;
      }
      if (--this.countDown === 0) {
        this.countDown = this.interval;
        return this.captureCC(top);
      }
    }
  }

export abstract class Runtime {
  stack: Stack;
  mode: Mode;

  constructor() {
    this.stack = [];
    this.mode = 'normal';
  }

  topK(f: () => any): KFrameTop {
    return {
      kind: 'top',
      f: () => {
        this.stack = [];
        this.mode = 'normal';
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

export const knownBuiltIns = [Object, Function, Boolean, Symbol, Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError, Number, Math, Date, String, RegExp, Array, Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, Map, Set, WeakMap, WeakSet];
