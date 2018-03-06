export * from 'stopify-continuations/dist/src/entrypoints/lazy';
export { Opts, AsyncRun } from '../types';
import { Opts, AsyncRun } from '../types';

import * as ContinuationsRTS from 'stopify-continuations/dist/src/entrypoints/lazy';
import { makeStopify } from '../runtime/runtimeOnly';
export { suspend, onEnd } from '../runtime/runtimeOnly';

const stopifyFn  = makeStopify(<any>ContinuationsRTS);

export function stopify(url: string, runtimeOpts: Opts): AsyncRun {
  return stopifyFn(url, runtimeOpts);
}
