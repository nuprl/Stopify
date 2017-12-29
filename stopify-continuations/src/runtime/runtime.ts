/**
 * Entrypoint of the stopify-continuations bundle
 */

export * from './abstractRuntime';
import { LazyRuntime } from './lazyRuntime';
import { EagerRuntime } from './eagerRuntime';
import { RetvalRuntime } from './retvalRuntime';
import { FudgeRuntime } from './fudgeRuntime';
import { transformFile } from 'babel-core';

export function newRTS(transform: string) {
  if (transform === 'lazy') {
    return new LazyRuntime();
  }
  else if (transform === 'eager') {
    return new EagerRuntime();
  }
  else if (transform === 'retval') {
    return new RetvalRuntime();
  }
  else if (transform === 'fudge') {
    return new FudgeRuntime();
  }
  else {
    throw new Error(`bad runtime: ${transform}`);
  }
}