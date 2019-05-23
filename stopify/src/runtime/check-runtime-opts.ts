import { RuntimeOpts } from '../types';
import { copyProp, transformProp } from
  '@stopify/continuations/dist/src/compiler/check-compiler-opts';

const validFlags = [
  'filename',
  'estimator',
  'yieldInterval',
  'resampleInterval',
  'timePerElapsed',
  'stop',
  'variance',
  'env',
  'stackSize',
  'restoreFrames'
];

/**
 * Given a partial 'Opts', fill in sensible defaults and dynamically
 * enforce type and value checks.
 *
 * @param value a 'CompilerOpts' with elided fields
 */
export function checkAndFillRuntimeOpts(value: Partial<RuntimeOpts>): RuntimeOpts {
  if (value === null || typeof value !== 'object') {
    throw new Error(`expected an object for Opts`);
  }

  Object.keys(value).forEach(key => {
    if (!validFlags.includes(key)) {
      throw new Error(`invalid flag: ${key}`);
    }
  });

  const opts: RuntimeOpts = {
    estimator: 'velocity',
    yieldInterval: 100,
    resampleInterval: 100,
    timePerElapsed: 1,
    stackSize: Infinity,
    restoreFrames: Infinity,

    filename: '',
    stop: undefined,
    variance: false,
    env: 'chrome'
  };

  copyProp(opts, value, 'estimator',
    (x) => ['exact', 'reservoir', 'velocity', 'interrupt', 'countdown'].includes(x),
    `.estimator must be either 'reservoir', 'velocity', 'interrupt', 'countdown', or 'exact'`);
  transformProp(opts, value, 'yieldInterval',
    (x) => Number(x), (x) => typeof x === 'number' && x > 0,
    `.yieldInterval must be a number greater than zero`);
  transformProp(opts, value, 'resampleInterval',
    (x) => Number(x), (x) => typeof x === 'number' && x > 0,
    `.resampleInterval must be a number greater than zero`);
  transformProp(opts, value, 'timePerElapsed',
    (x) => Number(x), (x) => typeof x === 'number' && x > 0,
    `.timePerElapsed must be a number greater than zero`);
  transformProp(opts, value, 'stackSize',
    (x) => Number(x), (x) => typeof x === 'number' && x > 0,
    `.stackSize must be a number greater than zero`);
  transformProp(opts, value, 'restoreFrames',
    (x) => Number(x), (x) => typeof x === 'number' && x > 0,
    `.restoreFrames must be a number greater than zero`);

  // TODO(arjun): The following flags only exist for benchmarking and testing
  // They don't really belong in the system.
  copyProp(opts, value, 'stop', (x) => true, '');
  copyProp(opts, value, 'variance', (x) => true, '');
  copyProp(opts, value, 'env', (x) => true, '');
  copyProp(opts, value, 'filename', (x) => true, '');
  return opts;
}
