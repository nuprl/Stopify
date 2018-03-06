import { Opts } from '../types';
import { copyProp, transformProp } from
  'stopify-continuations/dist/src/compiler/checkOpts';

const validFlags = [
  'filename',
  'estimator',
  'yieldInterval',
  'resampleInterval',
  'timePerElapsed',
  'stop',
  'variance',
  'env'
];

/**
 * Given a partial 'Opts', fill in sensible defaults and dynamically
 * enforce type and value checks.
 *
 * @param value a 'CompilerOpts' with elided fields
 */
export function checkAndFillRuntimeOpts(value: Partial<Opts>): Opts {
  if (value === null || typeof value !== 'object') {
    throw new Error(`expected an object for Opts`);
  }

  Object.keys(value).forEach(key => {
    if (!validFlags.includes(key)) {
      throw new Error(`invalid flag: ${key}`);
    }
  });

  const opts: Opts = {
    filename: '',
    estimator: 'reservoir',
    yieldInterval: 100,
    resampleInterval: 100,
    timePerElapsed: 1,
    stop: undefined,
    variance: false,
    env: 'chrome'
  }

  copyProp(opts, value, 'estimator',
    (x) => ['exact', 'reservoir', 'countdown'].includes(x),
    `.estimator must be either 'reservoir', 'countdown', or 'exact'`);
  transformProp(opts, value, 'yieldInterval',
    (x) => Number(x), (x) => typeof x === 'number' && x > 0,
    `.yieldInterval must be a number greater than zero`);
  transformProp(opts, value, 'resampleInterval',
    (x) => Number(x), (x) => typeof x === 'number' && x > 0,
    `.resampleInterval must be a number greater than zero`);
  transformProp(opts, value, 'timePerElapsed',
    (x) => Number(x), (x) => typeof x === 'number' && x > 0,
    `.timePerElapsed must be a number greater than zero`);
  // TODO(arjun): The following flags only exist for benchmarking and testing
  // They don't really belong in the system.
  copyProp(opts, value, 'stop', (x) => true, '');
  copyProp(opts, value, 'variance', (x) => true, '');
  copyProp(opts, value, 'env', (x) => true, '');
  copyProp(opts, value, 'filename', (x) => true, '');
  return opts;
}