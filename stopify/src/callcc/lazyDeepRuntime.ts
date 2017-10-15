import * as common from './runtime';
export * from './runtime';
import { ElapsedTimeEstimator } from '../elapsedTimeEstimator';
import * as assert from 'assert';

export class LazyDeepRuntime extends common.Runtime {
  /**
   * This is true if the restored value needs to be thrown
   */
  throwing: boolean = false;
  constructor(
    stackSize: number, yieldInterval: number, estimator: ElapsedTimeEstimator) {
    super(stackSize, yieldInterval, estimator);
    this.deepStacks = isNaN(this.stackSize) === false;
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
      throw new common.Restore(stack);
    };
  }

  runtime(body: () => any): any {
    let $ret;

    try {
      $ret = body();
    } catch(exn) {
      if (exn instanceof common.Restore) {
        return this.runtime(() => {
          if (exn.stack.length === 0) {
            throw new Error(`Can't restore from empty stack`);
          }
          this.mode = false;
          // Restore the stack when the continuation is applied.
          this.stack = exn.stack;
          //console.log(this.stack.length)
          return this.stack[0].f();
        });
      }
      else if (exn instanceof common.Capture) {
        //console.log(exn.stack.length)
        this.capturing = false;
        return this.runtime(() => {
          this.stack.unshift(...exn.stack)
          let except = exn.f.call(
            global, this.makeCont(this.stack))
          // Clear the stack here. This is because we only want to start
          // running the rest of the computation once the continuation is
          // applied.
          this.stack = []
          return except;
        })
      }
      else if (exn instanceof common.Discard) {
        return this.runtime(() => exn.f());
      }
      else if (this.stack.length === 0) {
        // We have threaded the user exception through the rest of the stack
        throw exn
      }
      else {
        // Since the top most stack frame is throwing the error, we have to
        // thread the exception through the lower stack frames to make sure
        // that catch handlers are invoked correctly.
        this.throwing = true;
        $ret = exn;
      }
    }

    if (this.stack.length > 0) {
      // The result of running the top most stack frame will be used by the
      // frame below it.
      this.stack[0].value = $ret;
      return this.runtime(() => {
        this.mode = false;
        return this.stack[0].f();
      });
    }
    else {
      return $ret
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

export default LazyDeepRuntime;
