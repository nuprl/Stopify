import * as common from './abstractRuntime';
export * from './abstractRuntime';
import { Result } from '../types';

export class RetvalRuntime extends common.Runtime {
  constructor(stackSize: number, restoreFrames: number) {
    super(stackSize, restoreFrames);
  }

  captureCC(f: (k: any) => any): common.Capture {
    this.capturing = true;
    return new common.Capture(f, []);
  }

  makeCont(stack: common.Stack) {
    const savedDelimitDepth = this.delimitDepth;
    const savedStack = this.savedStack;
    this.savedStack = [];
    for(let i = stack.length - 1; i >= this.restoreFrames; i -= 1) {
      savedStack.push(stack.pop()!);
    }

    return (v: any, err: any=this.noErrorProvided) => {

      const throwExn = err !== this.noErrorProvided;

      this.delimitDepth = savedDelimitDepth;

      let restarter = () => {
        if (throwExn) { throw err; }
        else { return v; }
      };

      return new common.Restore([this.topK(restarter), ...stack], savedStack);
    };
  }

  endTurn(callback: (onDone: (x: Result) => any) => any): never {
    throw new common.EndTurn(callback);
  }

  abstractRun(body: () => any): common.RunResult {
    try {
      const v = body();
      if (v instanceof common.Capture) {
        this.capturing = false;
        return { type: 'capture', stack: v.stack, f: v.f };
      }
      else if (v instanceof common.Restore) {
        return { type: 'restore', stack: v.stack, savedStack: v.savedStack };
      }
      else {
        return { type: 'normal', value: v };
      }
    }
    catch (exn) {
      if (exn instanceof common.EndTurn) {
        return { type: 'end-turn', callback: exn.callback };
      }
      return { type: 'exception', value: exn };
    }
  }
}
