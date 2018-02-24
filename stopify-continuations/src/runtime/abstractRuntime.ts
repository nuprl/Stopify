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
  value?: any;
}

export interface KFrameRest {
  kind: 'rest';
  f: () => any;   // The function we are in
  locals: any[];  // All locals and parameters
  index: number;  // At this application index
  value?: any;    // Value to be restored in deep runtimes.
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

  // Can the runtime support deep stacks.
  public type: 'shallow' | 'deep';

  // The runtime stack.
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

  abstract topK(f: () => any): KFrameTop;

  // TODO(rachit): Document.
  abstract runtime(body: () => any): any;

  // TODO(rachit): Document.
  abstract captureCC(f: (k: any) => any): void;

  // Wraps a stack in a function that throws an exception to discard the current
  // continuation. The exception carries the provided stack with a final frame
  // that returns the supplied value.
  abstract makeCont(stack: Stack): (v: any) => any;

  // TODO(rachit): Document.
  abstract handleNew(constr: any, ...args: any[]): any;

  // TODO(rachit): Document.
  abstract abstractRun(body: () => any): RunResult;
}

/**
 * Represents a runtime that does not support heap bounded stacks.
 *
 * Abstractly, the stack is restored bottom-up, i.e. from the oldest frame
 * to the most recent frame.
 */
export abstract class ShallowRuntime extends Runtime {
  type: 'shallow';

  constructor() {
    super();
    this.type = 'shallow'
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
      const result = this.abstractRun(body);
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
}

/**
 * Represents a runtime that does support heap bounded stacks.
 *
 * Abstractly, the stack is restored top-down, i.e. from the most recent
 * frame to the oldest frame. The topmost frame is popped off, run, and its
 * value is threaded into the next frame.
 */
export abstract class DeepRuntime extends Runtime {
  public type: 'deep';

  // True if the runtime should restore the next frame by throwing the value
  // returned from the previous frame.
  throwing: boolean;

  constructor() {
    super();
    this.type = 'deep';
    this.throwing = false;
  }

  topK(f: () => any): KFrameTop {
    return {
      kind: 'top',
      f: () => {
        this.stack.pop();
        return f();
      }
    };
  }

  runtime(body: () => any): any {

    while(true) {
      const result = this.abstractRun(body);

      if (result.type === 'normal') {
        // Inoked the next stack frame with the value field set to the
        // value returned by the previous frame.
        if (this.stack.length > 0) {
          this.stack[this.stack.length - 1].value = result.value;
          body = () => {
            this.mode = false;
            return this.stack[this.stack.length - 1].f()
          }
        }
        else {
          assert(this.mode, 'execution completed in restore mode')
          return
        }
      }
      else if (result.type === 'capture') {
        const newStack = result.stack;
        body = () => {
          for(var i = newStack.length - 1; i >= 0; i -= 1) {
            this.stack.push(newStack[i]);
          }
          let except = result.f.call(global, this.makeCont(this.stack))
          // Clear the stack here. This is because we only want to start
          // running the rest of the computation this the continuation
          // returns a result.
          this.stack = []
          return except;
        }
      }
      else if (result.type === 'restore') {
        body = () => {
          if (result.stack.length === 0) {
            throw new Error(`Can't restore from empty stack`);
          }
          this.mode = false;
          this.stack = result.stack;
          return this.stack[this.stack.length - 1].f();
        };
      }
      else if (result.type === 'exception') {

        // If there is a continuation left to restore, the exception must be
        // threaded through it in order to invoke any error handlers.
        if (this.stack.length > 0) {
          // This is set back to false in the generated code.
          this.throwing = true;
          this.stack[this.stack.length - 1].value = result.value;
          body = () => {
            this.mode = false;
            return this.stack[this.stack.length - 1].f()
          }
        }
        else {
          throw result.value; // userland exception
        }
      }
      else {
        return unreachable();
      }
    }
  }
}

export function isDeepRuntime(rts: Runtime): rts is DeepRuntime {
  return rts.type === 'deep';
}

const unavailableOnNode = [ 'TextDecoder' ];
export const knownBuiltIns = knowns
  .filter(x => !unavailableOnNode.includes(x))
  .map(o => eval(o));
