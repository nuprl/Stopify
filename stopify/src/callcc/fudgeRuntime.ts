import * as common from './runtime';
import { ElapsedTimeEstimator } from '../elapsedTimeEstimator';

class FudgedContinuationError {

  constructor(public v: any) { }

  toString() {
    return `FudgedContinuationError(${this.v})`;
  }

}

/** This runtime system doesn't actually implement any control operators.
 * Functions such as 'captureCC' are defined and will call their argument,
 * but don't save the stack.
 *
 * Unfortunately, all our program end by invoking the top continuation with
 * "done". Therefore, a program that runs correctly will terminate with
 * 'FudgedContinuationError(done)'. This is unfortunate. But, this
 * transformation still helps with debugging.
 */
export class FudgeRuntime extends common.Runtime {
  constructor(yieldInterval: number, estimator: ElapsedTimeEstimator) {
    super(yieldInterval, estimator);
  }

  captureCC(f: (k: any) => any): void {
    throw new common.Capture(f, []);
  }

  abortCC(f: () => any) {
    throw new common.Discard(f);
  }

  makeCont(stack: common.Stack) {
    return (v: any) => {
      throw new FudgedContinuationError(v);
    };
  }

  runtime(body: () => any): any {
    try {
      body();
    }
    catch (exn) {
      if (exn instanceof common.Capture) {
        return this.runtime(() => exn.f.call(global, this.makeCont(exn.stack)));
      } else if (exn instanceof common.Discard) {
        return this.runtime(() => exn.f());
      } else {
        throw exn; // userland exception
      }
    }
  }

  handleNew(constr: any, ...args: any[]) {
    return new constr(...args);
  }
}

export default FudgeRuntime;
