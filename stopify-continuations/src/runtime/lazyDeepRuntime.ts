import * as common from './abstractRuntime';

export * from './abstractRuntime';

export class LazyDeepRuntime extends common.DeepRuntime {
  /**
   * This is true if the restored value needs to be thrown
   */
  throwing: boolean = false;
  type: 'lazyDeep'
  constructor() {
    super();
    this.type = 'lazyDeep';
  }

  captureCC(f: (k: any) => any): void {
    this.capturing = true;
    throw new common.Capture(f, []);
  }

  makeCont(stack: common.Stack) {
    return (v: any) => {
      var frame: common.KFrameTop = {
        kind: 'top',
        f: () => {
          this.stack.pop();
          return v;
        },
        value: undefined
      };
      throw new common.Restore([...stack, frame]);
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
