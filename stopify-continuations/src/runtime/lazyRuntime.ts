import * as common from './abstractRuntime';

export * from './abstractRuntime';

export class LazyRuntime extends common.Runtime {

  constructor(restoreFrames: number) {
    super(restoreFrames);
    this.type = 'lazy';
  }

  captureCC(f: (k: any) => any): void {
    this.capturing = true;
    throw new common.Capture(f, []);
  }

  makeCont(stack: common.Stack, savedStack?: common.Stack) {
    const savedDelimitDepth = this.delimitDepth;

    return (v: any, err: any=this.noErrorProvided) => {
      // Restore the saved stack.
      if (savedStack) {
        this.savedStack = savedStack;
      }

      this.delimitDepth = savedDelimitDepth;

      const throwExn = err !== this.noErrorProvided;

      let restarter = () => {
        if (throwExn) { throw err; }
        else { return v; }
      };

      // TODO(rachit): ...stack copies the whole stack. Modify instead of copy.
      throw new common.Restore([this.topK(restarter), ...stack]);
    };
  }

  abstractRun(body: () => any): common.RunResult {
    try {
      const v = body();
      return { type: 'normal', value: v };
    } catch(exn) {
      if (exn instanceof common.Capture) {
        this.capturing = false;
        return { type: 'capture', stack: exn.stack, f: exn.f };
      }
      else if (exn instanceof common.Restore) {
        return { type: 'restore', stack: exn.stack };
      }
      else {
        return { type: 'exception', value: exn };
      }
    }
  }
}
