import * as common from './abstractRuntime';
export * from './abstractRuntime';
import { Result } from '../types';

export class LazyRuntime extends common.Runtime {
  constructor(stackSize: number, restoreFrames: number) {
    super(stackSize, restoreFrames);
  }

  stopifyArray(arr: Array<any>) {
    // We use require because this module requires Stopify to be loaded before
    // it is loaded. A top-level import would not work.
    const hofs = require('../generated_runtime/hofs.lazy');
    Reflect.setPrototypeOf(arr, hofs.stopifyArrayPrototype);
    return arr;
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
