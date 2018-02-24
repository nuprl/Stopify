import * as common from './abstractRuntime';
export * from './abstractRuntime';

export class RetvalRuntime extends common.Runtime {
  type: 'retval';

  constructor() {
    super();
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

  handleNew(constr: any, ...args: any[]) {
    if (common.knownBuiltIns.includes(constr)) {
      return new constr(...args);
    }

    let obj, result;
    if (this.mode) {
      obj = Object.create(constr.prototype);
    } else {
      const frame = this.stack[this.stack.length - 1];
      if (frame.kind === "rest") {
        [obj] = frame.locals;
      } else {
        throw "bad";
      }
      this.stack.pop();
    }

    if (this.mode) {
      result = constr.apply(obj, args);
    } else {
      result = this.stack[this.stack.length-1].f.apply(obj, []);
    }
    if (result instanceof common.Capture) {
      result.stack.push({
        kind: "rest",
        f: () => this.handleNew(constr, ...args) ,
        locals: [obj],
        index: 0
      });
      return result;
    } else if (result instanceof common.Restore) {
      return result;
    }

    return typeof result === 'object' ? result : obj;
  }
}

export default new RetvalRuntime();
