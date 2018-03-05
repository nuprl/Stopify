/**
 * Entrypoint of the stopify-continuations bundle
 */

import { Runtime } from './abstractRuntime';
import { LazyRuntime } from './lazyRuntime';
import { EagerRuntime } from './eagerRuntime';
import { RetvalRuntime } from './retvalRuntime';
import { FudgeRuntime } from './fudgeRuntime';
import { LazyDeepRuntime } from './lazyDeepRuntime';
import { knowns } from '../common/cannotCapture';

export * from './abstractRuntime';
export { knownBuiltIns } from '../common/cannotCapture';

let savedRTS: Runtime | undefined;
export function newRTS(transform: string) : Runtime {

  if (savedRTS) {
    return savedRTS;
  }
  else {
    switch (transform) {
      case 'lazy': savedRTS = new LazyRuntime(); break;
      case 'eager': savedRTS = new EagerRuntime(); break;
      case 'retval': savedRTS = new RetvalRuntime(); break;
      case 'lazyDeep': savedRTS = new LazyDeepRuntime(); break;
      case 'fudge': savedRTS = new FudgeRuntime(); break;
      default: throw new Error(`bad runtime: ${transform}`);
    }

    return savedRTS;
  }
}

const unavailableOnNode = [ 'TextDecoder' ];
export const knownBuiltIns = knowns
  .filter(x => !unavailableOnNode.includes(x))
  .map(o => eval(o));

export const RV_SENTINAL = Symbol('rv_sentinal');
export const EXN_SENTINAL = Symbol('exn_sentinal');
