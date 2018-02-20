/**
 * Entrypoint of the stopify-continuations bundle
 */

export * from './abstractRuntime';
import { Runtime } from './abstractRuntime';
import { LazyRuntime } from './lazyRuntime';
import { EagerRuntime } from './eagerRuntime';
import { RetvalRuntime } from './retvalRuntime';
import { FudgeRuntime } from './fudgeRuntime';

export * from './abstractRuntime';

let savedRTS: Runtime | undefined;
export function newRTS(transform: string): Runtime {
  if (!savedRTS) {
    switch (transform) {
      case 'lazy': savedRTS = new LazyRuntime(); break;
      case 'eager': savedRTS = new EagerRuntime(); break;
      case 'retval': savedRTS = new RetvalRuntime(); break;
      case 'fudge': savedRTS = new FudgeRuntime(); break;
      default: throw new Error(`bad runtime: ${transform}`);
    }
  }
  return savedRTS;
}

export const RV_SENTINAL = Symbol('rv_sentinal');
export const EXN_SENTINAL = Symbol('exn_sentinal');
