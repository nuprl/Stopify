import * as common from './abstractRuntime';

export * from './abstractRuntime';

export class RetvalRuntime extends common.Runtime {

  constructor(restoreFrames: number) {
    super(restoreFrames);
    this.type = 'retval';
  }

  captureCC(f: (k: any) => any): common.Capture {
    this.capturing = true;
    return new common.Capture(f, []);
  }

  makeCont(stack: common.Stack) {
    return (v: any, err: any = this.noErrorProvided) => {
      const throwExn = err !== this.noErrorProvided;
      let restarter = () => {
        if (throwExn) { throw err; }
        else { return v; }
      }
      return new common.Restore([this.topK(restarter), ...stack]);
    }
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

// TODO(rachit): This is probably wrong.
//export default new RetvalRuntime();
