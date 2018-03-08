/**
 * Entrypoint of the stopify-continuations bundle
 */

import { Runtime } from './abstractRuntime';
import { LazyRuntime } from './lazyRuntime';
import { EagerRuntime } from './eagerRuntime';
import { RetvalRuntime } from './retvalRuntime';
import { FudgeRuntime } from './fudgeRuntime';

export * from './abstractRuntime';
export { knownBuiltIns } from '../common/cannotCapture';

let savedRTS: Runtime | undefined;
export function newRTS(transform: string) : Runtime {

  if (savedRTS) {
    return savedRTS;
  }
  else {
    switch (transform) {
      // Runtimes default to shallow.
      case 'lazy': savedRTS = new LazyRuntime(Infinity); break;
      case 'eager': savedRTS = new EagerRuntime(Infinity); break;
      case 'retval': savedRTS = new RetvalRuntime(Infinity); break;
      case 'fudge': savedRTS = new FudgeRuntime(); break;
      default: throw new Error(`bad runtime: ${transform}`);
    }

    return savedRTS;
  }
}

export const RV_SENTINAL = Symbol('rv_sentinal');
export const EXN_SENTINAL = Symbol('exn_sentinal');
