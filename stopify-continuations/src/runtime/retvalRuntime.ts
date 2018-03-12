import * as common from './abstractRuntime';
export * from './abstractRuntime';

export class RetvalRuntime extends common.Runtime {
  type: 'retval';

  constructor(stackSize: number, restoreFrames: number) {
    super(stackSize, restoreFrames);
    this.type = 'retval';
  }

  captureCC(f: (k: any) => any): common.Capture {
    this.capturing = true;
    return new common.Capture(f, []);
  }

  makeCont(JSStack: common.Stack, savedStack: common.Stack) {
    const savedDelimitDepth = this.delimitDepth;

    return (v: any, err: any=this.noErrorProvided) => {

      this.savedStack = savedStack;

      const throwExn = err !== this.noErrorProvided;

      this.delimitDepth = savedDelimitDepth;

      let restarter = () => {
        if(throwExn) { throw err; }
        else { return v; }
      }
      return new common.Restore([this.topK(restarter), ...JSStack]);
    };
  }

  abstractRun(body: () => any): common.RunResult {
    try {
      const v = body();
      if (v instanceof common.Capture) {
        this.capturing = false;
        return { type: 'capture', stack: v.stack, f: v.f };
      }
      else if (v instanceof common.Restore) {
        return { type: 'restore', stack: v.stack };
      }
      else {
        return { type: 'normal', value: v };
      }
    }
    catch (exn) {
      return { type: 'exception', value: exn };
    }
  }
}

export default new RetvalRuntime(Infinity, Infinity);
