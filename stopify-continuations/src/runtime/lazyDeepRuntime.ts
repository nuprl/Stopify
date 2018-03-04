import * as common from './abstractRuntime';
import { PushPopStack } from '../common/stack';

export * from './abstractRuntime';

export class LazyDeepRuntime extends common.DeepRuntime {
  /**
   * This is true if the restored value needs to be thrown
   */
  throwing: boolean = false;
  constructor(sizeHint?: number) {
    super();
    if (sizeHint) {
      this.sizeHint = sizeHint;
      this.stack = this.newStack();
    }
    else {
      throw new Error('LazyDeepRuntime requires a size hint');
    }
  }

  newStack(initArray?: Array<common.KFrame>) {
    return new PushPopStack<common.KFrame>(this.sizeHint);
  }

  captureCC(f: (k: any) => any): void {
    this.capturing = true;
    throw new common.Capture(f, this.newStack());
  }

  makeCont(stack: common.RuntimeStack) {
    const savedDelimitDepth = this.delimitDepth;

    return (v: any, err: any = this.noErrorProvided) => {
      const thrownExn = err !== this.noErrorProvided;
      this.delimitDepth = savedDelimitDepth;
      let restarter = () => {
        if (thrownExn) { throw err; }
        else { return v; }
      }
      stack.push(this.topK(restarter))
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

  handleNew(constr: any, ...args: any[]) {
    if (common.knownBuiltIns.includes(constr)) {
      return new constr(...args);
    }

    let obj, $value;
    if (this.mode) {
      obj = Object.create(constr.prototype);
    } else {
      const frame = this.stack.peek();
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
