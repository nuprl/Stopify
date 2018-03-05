export * from '../runtime/abstractRuntime';
import { Stack, RunResult } from '../runtime/abstractRuntime';
export * from '../runtime/sentinels';
import { LazyRuntime } from '../runtime/lazyRuntime';

const rts = new LazyRuntime();

export function captureCC(f: (k: any) => any): void {
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
