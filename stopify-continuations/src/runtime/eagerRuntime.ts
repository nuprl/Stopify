import * as common from './abstractRuntime';
export * from './abstractRuntime';

export class EagerRuntime extends common.Runtime {
  type: 'eager';

  eagerStack: common.Stack;

  constructor(stackSize: number, restoreFrames: number) {
    super(stackSize, restoreFrames);
    this.eagerStack = [];
    this.type = 'eager';
  }

  captureCC(f: (k: any) => any) {
    this.capturing = true;
    throw new common.Capture(f, [...this.eagerStack]);
  }

  makeCont(stack: common.Stack) {
    return (v: any, err: any=this.noErrorProvided) => {
      var throwExn = err !== this.noErrorProvided;
      let restarter = () => {
        if(throwExn) { throw err; }
        else { return v; }
      };
      this.eagerStack = [...stack];
      throw new common.Restore([this.topK(restarter), ...stack], []);
    };
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
      else {
        return { type: 'exception', value: exn };
      }
    }
  }
}
