import * as common from './abstractRuntime';
export * from './abstractRuntime';
import { Result } from '../types';
import * as types from '../types';

export class LazyRuntime extends common.Runtime {
  kind: types.CaptureMethod = 'lazy';

  constructor(stackSize: number, restoreFrames: number) {
    super(stackSize, restoreFrames);
  }

  captureCC(f: (k: (x: Result) => any) => any): any {
    this.capturing = true;
    throw new common.Capture(f, []);
  }

  makeCont(stack: common.Stack) {
    const savedStack = this.savedStack;
    this.savedStack = [];

    for(let i = stack.length - 1; i >= this.restoreFrames; i -= 1) {
      savedStack.push(stack.pop()!);
    }

    return (x: Result) => {
      let restarter = () => {
        if (x.type === 'exception') {
          throw x.value;
        }
        else {
          return x.value;
        }
      };
      throw new common.Restore([this.topK(restarter), ...stack], savedStack);
    };
  }

  endTurn(callback: (onDone: (x: Result) => any) => any): never {
    this.savedStack = [];
    this.stack = [];
    throw new common.EndTurn(callback);
  }

  /**
   * Support for suspensions in `async/await` programming model.
   *
   * Programs using `async/await` sequentially chain `Promise` resolutions,
   * i.e. there is no coordination between resolving multiple promises "in
   * parallel". Top-level calls to async functions return a Promise containing
   * either the resolved value or a stack capture exception. Since this
   * exception cannot escape the Promise, top-level async function calls must
   * be wrapped by the `promise` function to asynchronously restore the
   * continuation contained within the promise, and continue the promise chain.
   */
  promise(p: Promise<any>): any {
    return p.then(v =>
      this.runtime(() => {
        if (v instanceof common.Capture ||
          v instanceof common.Restore ||
          v instanceof common.EndTurn) {
          throw v;
        } else {
          return v;
        }
      }, v => {
        if (v.type === 'normal' && v.value instanceof Promise) {
          return this.promise(v.value);
        } else {
          return v;
        }
      }));
  }

  abstractRun(body: () => any): common.RunResult {
    try {
      const v = body();
      return { type: 'normal', value: v };
    }
    catch (exn) {
      if (exn instanceof common.Capture) {
        this.capturing = false;
        return { type: 'capture', stack: exn.stack, f: exn.f };
      }
      else if (exn instanceof common.Restore) {
        return { type: 'restore', stack: exn.stack, savedStack: exn.savedStack };
      }
      else if (exn instanceof common.EndTurn) {
        return { type: 'end-turn', callback: exn.callback };
      }
      else {
        return { type: 'exception', value: exn };
      }
    }
  }
}
