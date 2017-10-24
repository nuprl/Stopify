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
    let $ret, toRun: (() => any) | undefined = body
    while(toRun) {
      try {
        $ret = toRun();
        toRun = undefined;
      } catch(exn) {
        if (exn instanceof common.Restore) {
          toRun = () => {
            if (exn.stack.length === 0) {
              throw new Error(`Can't restore from empty stack`);
            }
            this.mode = false;
            // Restore the stack when the continuation is applied.
            this.stack = exn.stack;
            //console.log(this.stack.length)
            return this.stack[this.stack.length - 1].f();
          };
          continue;
        }
        else if (exn instanceof common.Capture) {
          this.capturing = false;
          toRun = () => {
            for(var i = exn.stack.length - 1; i >= 0; i -= 1) {
              this.stack.push(exn.stack[i]);
            }
            let except = exn.f.call(
              global, this.makeCont(this.stack))
            // Clear the stack here. This is because we only want to start
            // running the rest of the computation once the continuation is
            // applied.
            this.stack = []
            return except;
          }
          continue;
        }
        else if (exn instanceof common.Discard) {
          toRun = () => exn.f();
          continue;
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
        this.stack[this.stack.length - 1].value = $ret;
        toRun = () => {
          this.mode = false;
          return this.stack[this.stack.length- 1].f();
        };
        continue;
      }
      else {
        return $ret
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

export default LazyDeepRuntime;
