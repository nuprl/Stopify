/**
 * Entrypoint of the stopify-continuations bundle
 */

import { RuntimeImpl } from './abstractRuntime';
import { LazyRuntime } from './lazyRuntime';
import { EagerRuntime } from './eagerRuntime';
import { RetvalRuntime } from './retvalRuntime';
import { FudgeRuntime } from './fudgeRuntime';

export * from './abstractRuntime';

let savedRTS: RuntimeImpl | undefined;
export function newRTS(transform: string, stackSize: number = Infinity, restoreFrames: number = Infinity): RuntimeImpl {
  if (!savedRTS || savedRTS.kind !== transform) {
    switch (transform) {
      // Default to shallow runtime.
      case 'catch':
        savedRTS = new LazyRuntime(stackSize, restoreFrames);
        savedRTS.kind = 'catch'; // TODO(arjun): Sloppy
        break;
      case 'lazy': savedRTS = new LazyRuntime(stackSize, restoreFrames); break;
      case 'eager': savedRTS = new EagerRuntime(stackSize, restoreFrames); break;
      case 'retval': savedRTS = new RetvalRuntime(stackSize, restoreFrames); break;
      case 'fudge': savedRTS = new FudgeRuntime(); break;
      default: throw new Error(`bad runtime: ${transform}`);
    }
  }
  return savedRTS;
}

