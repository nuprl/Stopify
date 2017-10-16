import * as common from './runtime';
export * from './runtime';
import { ElapsedTimeEstimator } from '../elapsedTimeEstimator';
import * as assert from 'assert';

export class LazyRuntime extends common.Runtime {
  constructor(
    deepstacks: number, yieldInterval: number, estimator: ElapsedTimeEstimator) {
    super(yieldInterval, estimator);
  }

  captureCC(f: (k: any) => any): void {
    this.capturing = true;
    throw new common.Capture(f, []);
  }

  abortCC(f: () => any) {
    throw new common.Discard(f);
  }

  makeCont(stack: common.Stack) {
    return (v: any) => {
      throw new common.Restore([...stack]);
    };
  }

  runtime(body: () => any, stack: common.Stack = []): any {
    try {
      let $ret = body();
      if (stack.length > 0) {
        stack[0].value = $ret;
        return this.runtime(() => {
          this.mode = false;
          this.stack = stack;
          return this.stack[0].f()
        }, this.stack)
      } else {
        return $ret
      }
    } catch(exn) {
      if (exn instanceof common.Restore) {
        return this.runtime(() => {
          //console.dir(exn.stack)
          if (exn.stack.length === 0) {
            throw new Error(`Can't restore from empty stack`);
          }
          this.mode = false;
          this.stack = exn.stack;
          return this.stack[0].f();
        }, exn.stack);
      }
      else if (exn instanceof common.Capture) {
        this.capturing = false;
        return this.runtime(() =>
          exn.f.call(
            global, this.makeCont([...exn.stack, ...this.stack]), exn.stack))
      }
      else if (exn instanceof common.Discard) {
        return this.runtime(() => exn.f());
      }
      else {
        throw exn // user exception
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
      const frame = this.stack[0];
      if (frame.kind === "rest") {
        [obj] = frame.locals;
        $value = frame.value;
      } else {
        throw "bad";
      }
      this.stack.shift();
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
          value: undefined // TODO: Fill this.
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

export default LazyRuntime;
