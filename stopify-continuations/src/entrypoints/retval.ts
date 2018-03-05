export * from '../runtime/abstractRuntime';
import { Stack, RunResult, Capture } from '../runtime/abstractRuntime';
export * from '../runtime/sentinels';
import { RetvalRuntime } from '../runtime/retvalRuntime';

const rts = new RetvalRuntime();

// NOTE(arjun): The return type of this function is different from the others
// that return void.
export function captureCC(f: (k: any) => any): Capture {
  return rts.captureCC(f);
}

export function makeCont(stack: Stack): (v: any) => any {
  return rts.makeCont(stack);
}

export function runtime(body: () => any): any {
  return rts.runtime(body);
}

export function handleNew(constr: any, ...args: any[]): any {
  return rts.handleNew(constr, ...args);
}

export function abstractRun(body: () => any): RunResult {
  return rts.abstractRun(body);
}
