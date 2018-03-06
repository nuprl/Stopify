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
    const savedDelimitDepth = this.delimitDepth;

    return (v: any, err: any=this.noErrorProvided) => {
      const thrownExn = err !== this.noErrorProvided;
      this.delimitDepth = savedDelimitDepth;
      let restarter = () => {
        if (thrownExn) { throw err; }
        else { return v; }
      };
      // Since the stack is unwound with the most recent call first, the
      // restarter needs to be on the top of the stack.
      stack.push(this.topK(restarter));
      throw new common.Restore(stack);
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
