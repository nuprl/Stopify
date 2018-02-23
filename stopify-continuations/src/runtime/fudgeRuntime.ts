import * as common from './abstractRuntime';
export * from './abstractRuntime';

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
export class FudgeRuntime extends common.ShallowRuntime {
  constructor() {
    super();
  }

  captureCC(f: (k: any) => any): void {
    throw new common.Capture(f, []);
  }

  makeCont(stack: common.Stack) {
    return (v: any) => {
      throw new FudgedContinuationError(v);
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
      else {
        return { type: 'exception', value: exn };
      }
    }
  }

  handleNew(constr: any, ...args: any[]) {
    return new constr(...args);
  }
}

export default new FudgeRuntime();
