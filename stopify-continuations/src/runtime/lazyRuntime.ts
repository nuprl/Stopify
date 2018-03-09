import * as common from './abstractRuntime';
export * from './abstractRuntime';

export class LazyRuntime extends common.Runtime {
  type: 'lazy';

  constructor() {
    super();
    this.type = 'lazy';
  }

  captureCC(f: (k: any) => any): void {
    this.capturing = true;
    throw new common.Capture(f, []);
  }

  makeCont(stack: common.Stack) {
    const savedDelimitDepth = this.delimitDepth;

    return (v: any, err: any=this.noErrorProvided) => {
      const throwExn = err !== this.noErrorProvided;
      this.delimitDepth = savedDelimitDepth;
      let restarter = () => {
        if(throwExn) { throw err; }
        else { return v; }
      }
      throw new common.Restore([this.topK(restarter), ...stack]);
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
        return { type: 'restore', stack: exn.stack };
      }
      else {
        return { type: 'exception', value: exn };
      }
    }
  }
}
