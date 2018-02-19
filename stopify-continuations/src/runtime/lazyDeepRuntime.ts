import * as common from './runtime';

export * from './abstractRuntime';

export class LazyDeepRuntime extends common.DeepRuntime {
  /**
   * This is true if the restored value needs to be thrown
   */
  throwing: boolean = false;
  constructor() {
    super();
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

  handleNew(constr: any, ...args: any[]) {
    if (common.knownBuiltIns.includes(constr)) {
      return new constr(...args);
    }

    let obj, $value;
    if (this.mode) {
      obj = Object.create(constr.prototype);
    } else {
      const frame = this.stack[this.stack.length - 1];
      if (frame.kind === "rest") {
        [obj] = frame.locals;
        $value = frame.value;
      } else {
        throw "bad";
      }
      this.stack.pop();
    }

    let result: any;
    try {
      if (this.mode) {
        result = constr.apply(obj, args);
      }
      else {
        result = $value
      }
    }
    catch (exn) {
      if (exn instanceof common.Capture) {
        exn.stack.push({
          kind: "rest",
          f: () => this.handleNew(constr, ...args) ,
          locals: [obj],
          index: 0,
          value: undefined
        });
      }
      throw exn;
    }

    if (typeof result === 'object') {
      return result;
    }
    else {
      return obj;
    }
  }
}
