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

// This class is used by all the runtimes to start the stack capturing process.
export class Capture {
  constructor(public f: (k: any) => any, public stack: Stack) {}
}

export abstract class Runtime {
  public type: string;
  stack: Stack;

  // Mode of the program. `true` represents 'normal' mode while `false`
  // represents 'restore' mode.
  mode: Mode;

  noErrorProvided: any = {};

  linenum: undefined | number;

  constructor(
    // True when the instrumented program is capturing the stack.
    public capturing: boolean = false,

    /**
     * Represents the level of nesting in the runtime. Crucially, if the
     * delimitDepth > 1, then stopify does not allow the program to suspend.
     */
    public delimitDepth: number = 0,

    // true if computation is suspended by 'suspend'.
    public isSuspended: boolean = false,

    // a queue of computations that need to be run.
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
    return this.resume();
  }

  // Queues the thunk to be processed by the runtime.
  // If there are no other processes running, it is invoked immediately.
  delimit(thunk: () => any): any {
    if (this.isSuspended === false) {
      this.runtime_(thunk);
      if (this.delimitDepth === 0) {
        return this.resume();
      }
    }
    else {
      return this.pendingRuns.push(thunk);
    }
  }

  // Try to resume the program. If the program has been suspended externally,
  // this does nothing. Otherwise, it runs the next function in the queue.
  resume(): any {
    if (this.isSuspended) {
      return;
    }
    if (this.pendingRuns.length > 0) {

      // TODO(rachit): Don't use shift here. It is slow.
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

  // TODO(rachit): Document this.
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

  // Called when the stack needs to be captured.
  abstract captureCC(f: (k: any) => any): void;

  /**
   * Wraps a stack in a function that throws an exception to discard the
   * current continuation. The exception carries the provided stack with a
   * final frame that returns the supplied value. If err is provided, instead
   * of returning the supplied value, it throws an exception with the provided
   * error.
   */
  abstract makeCont(stack: Stack): (v: any, err: any) => any;

  /**
   * Run the `body`. It can return four types of values (in the form RunResult):
   *
   * 'normal': The execution of the body terminated normally.
   * 'capture': The execution of the body resulted in a stack capturing operation.
   * 'restore': The execution of the body resulted in a stack restoration
   *            operation.
   * 'exception': The excution of the body resulted in a userland exception.
   */
  abstract abstractRun(body: () => any): RunResult;
}
