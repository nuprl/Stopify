import * as common from './abstractRuntime';
import { GeneralStack } from "../common/stack";
export * from './abstractRuntime';

export class EagerRuntime extends common.ShallowRuntime {
  type: 'eager';

  eagerStack: common.RuntimeStack;

  constructor() {
    super();
    this.type = 'eager';
    this.eagerStack = this.newStack();
  }

  newStack(initArray?: Array<common.KFrame>): common.RuntimeStack {
    return new GeneralStack<common.KFrame>(this.sizeHint, initArray);
  }

  captureCC(f: (k: any) => any) {
    this.capturing = true;
    throw new common.Capture(f, this.newStack([...this.eagerStack]));
  }

  makeCont(stack: common.RuntimeStack) {
    return (v: any, err: any=this.noErrorProvided) => {
      var throwExn = err !== this.noErrorProvided;
      let restarter = () => {
        if(throwExn) { throw err; }
        else { return v; }
      }
      this.eagerStack = this.newStack([...stack]);
      throw new common.Restore(this.newStack([this.topK(restarter), ...stack]))
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
      const frame = this.stack.peek();
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
      result = this.stack.peek().f.apply(obj, []);
      this.eagerStack.shift();
    }
    return typeof result === 'object' ? result : obj;
  }
}

export default new EagerRuntime();
