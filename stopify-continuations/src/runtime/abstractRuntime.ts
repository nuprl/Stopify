import { knowns } from '../common/cannotCapture'
import { unreachable } from '../generic';
import * as assert from 'assert';

export type RunResult =
  { type: 'normal', value: any } |
  { type: 'exception', value: any } |
  { type: 'capture', stack: Stack, f: (value: any) => any } |
  { type: 'restore', stack: Stack }

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

export interface RuntimeInterface {
  type: string;

  captureCC(f: (k: any) => any): void;
  // Wraps a stack in a function that throws an exception to discard the current
  // continuation. The exception carries the provided stack with a final frame
  // that returns the supplied value.
  makeCont(stack: Stack): (v: any) => any;
  runtime(body: () => any): any;
  handleNew(constr: any, ...args: any[]): any;
  abstractRun(body: () => any): RunResult;
}

export abstract class Runtime {
  public type: string;
  stack: Stack;
  mode: Mode;
  linenum: undefined | number;

  constructor(
    public capturing: boolean = false,
    public delimitDepth: number = 0,
    // true if computation is suspended by 'suspend'
    public isSuspended: boolean = false,
    // a queue of computations that need to run
    private pendingRuns: (() => void)[] = []) {
    this.stack = [];
    this.mode = true;
  }

  private runtime_(thunk: () => any) {
    this.delimitDepth++;
    this.runtime(thunk);
    this.delimitDepth--;
  }

  resumeFromSuspension(thunk: () => any): any {
    this.isSuspended = false;
    this.runtime_(thunk);
    this.resume();
  }

  /**
   * Evaluates 'thunk' either now or later.
   */
  delimit(thunk: () => any): any {
    if (this.isSuspended === false) {
      this.runtime_(thunk);
      if (this.delimitDepth === 0) {
        this.resume();
      }
    }
    else {
      return this.pendingRuns.push(thunk);
    }
  }

  resume(): any {
    if (this.isSuspended) {
      return;
    }
    if (this.pendingRuns.length > 0) {
      return this.delimit(this.pendingRuns.shift()!);
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

  runtime(body: () => any): any {
    while (true) {
      const result = this.abstractRun(body)
      if (result.type === 'normal') {
        assert(this.mode, 'executing completed in restore mode');
        return;
      }
      else if (result.type === 'capture') {
        body = () => result.f.call(global, this.makeCont(result.stack));
      }
      else if (result.type === 'restore') {
        body = () => {
          this.mode = false;
          this.stack = result.stack;
          return this.stack[this.stack.length - 1].f();
        };
      }
      else if (result.type === 'exception') {
        throw result.value; // userland exception
      }
      else {
        return unreachable();
      }
    }
  }

  abstract captureCC(f: (k: any) => any): void;
  // Wraps a stack in a function that throws an exception to discard the current
  // continuation. The exception carries the provided stack with a final frame
  // that returns the supplied value.
  abstract makeCont(stack: Stack): (v: any) => any;
  abstract handleNew(constr: any, ...args: any[]): any;
  abstract abstractRun(body: () => any): RunResult;
}

const unavailableOnNode = [ 'TextDecoder' ];
export const knownBuiltIns = knowns.filter(x => !unavailableOnNode.includes(x))
  .map(o => eval(o));
