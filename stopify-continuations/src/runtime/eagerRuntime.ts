import * as common from './abstractRuntime';
export * from './abstractRuntime';

export class EagerRuntime extends common.Runtime {
  type: 'eager';

  eagerStack: common.Stack;

  constructor() {
    super();
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
      }
      this.eagerStack = [...stack];
      throw new common.Restore([this.topK(restarter), ...stack]);
    }
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
      this.eagerStack.unshift({
        kind: "rest",
        f: () => this.handleNew(constr, ...args) ,
        locals: [obj],
        index: 0
      });
      result = constr.apply(obj, args);
      this.eagerStack.shift();
    } else {
      result = this.stack[this.stack.length - 1].f.apply(obj, []);
      this.eagerStack.shift();
    }
    return typeof result === 'object' ? result : obj;
  }
}

export default new EagerRuntime();
