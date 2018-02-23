import * as common from './abstractRuntime';
import { PushPopStack } from '../common/stack';

export * from './abstractRuntime';

export class LazyRuntime extends common.ShallowRuntime {
  type: 'lazy';

  constructor() {
    super();
    this.type = 'lazy';
  }

  newStack(initArray?: Array<common.KFrame>): common.RuntimeStack {
    return new PushPopStack<common.KFrame>(this.sizeHint, initArray);
  }

  captureCC(f: (k: any) => any): void {
    this.capturing = true;
    throw new common.Capture(f, this.newStack());
  }

  makeCont(stack: common.RuntimeStack) {
    const savedDelimitDepth = this.delimitDepth;

    return (v: any, err: any=this.noErrorProvided) => {
      const throwExn = err !== this.noErrorProvided;
      this.delimitDepth = savedDelimitDepth;
      let restarter = () => {
        if(throwExn) { throw err; }
        else { return v; }
      }
      throw new common.Restore(this.newStack([this.topK(restarter), ...stack]));
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

  handleNew(constr: any, ...args: any[]) {
    if (common.knownBuiltIns.includes(constr)) {
      return new constr(...args);
    }

    let obj;
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

    let result: any;
    try {
      if (this.mode) {
        result = constr.apply(obj, args);
      }
      else {
        result = this.stack.peek().f.apply(obj, []);
      }
    }
    catch (exn) {
      if (exn instanceof common.Capture) {
        exn.stack.push({
          kind: "rest",
          f: () => this.handleNew(constr, ...args) ,
          locals: [obj],
          index: 0
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
