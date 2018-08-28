/**
 * Entrypoint of the stopify-continuations bundle
 */

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
      // Default to shallow runtime.
      case 'catch':
      case 'lazy': savedRTS = new LazyRuntime(Infinity, Infinity); break;
      case 'eager': savedRTS = new EagerRuntime(Infinity, Infinity); break;
      case 'retval': savedRTS = new RetvalRuntime(Infinity, Infinity); break;
      case 'fudge': savedRTS = new FudgeRuntime(); break;
      default: throw new Error(`bad runtime: ${transform}`);
    }
  }
  return savedRTS;
}

