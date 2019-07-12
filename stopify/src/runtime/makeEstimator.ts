import { RuntimeOpts } from '../types';
import { unreachable } from '../generic';
import {
  ElapsedTimeEstimator,
  ExactTimeEstimator,
  CountdownTimeEstimator,
  SampleAverageTimeEstimator,
  VelocityEstimator,
} from '@stopify/estimators';

/**
 * Checks the current time whenever 'elapsedTime' is applied, instead of
 * estimating the elapsed time.
 */
export function makeExact(): ElapsedTimeEstimator {
  return new ExactTimeEstimator();
}
/**
 * Assumes that 'elapsedTime' is applied every 'timePerElapsed' milliseconds
 * and uses this to estimate the elapsed time.
 *
 * @param timePerElapsed time (in milliseconds) between successive calls to
 *                       'elapsedTime'
 */
export function makeCountdown(timePerElapsed: number): ElapsedTimeEstimator {
  return new CountdownTimeEstimator(timePerElapsed);
}

/**
 * Estimates 'elapsedTime' by sampling the current time when 'elapsedTime'
 * is applied.
 *
 * We use reservoir sampling with a reservoir of size 1, thus all times are
 * equally likely to be selected.
 */
export function makeSampleAverage(): ElapsedTimeEstimator {
  return new SampleAverageTimeEstimator();
}

/**
 * Estimates 'elapsedTime' by periodically resampling the current time.
 *
 * @param resample Period between resamples.
 */
export function makeVelocityEstimator(resample: number = 100): ElapsedTimeEstimator {
  return new VelocityEstimator(resample);
}

export function makeEstimator(opts: RuntimeOpts): ElapsedTimeEstimator {
  if (opts.estimator === 'exact') {
    return makeExact();
  }
  else if (opts.estimator === 'countdown') {
    return makeCountdown(opts.timePerElapsed!);
  }
  else if (opts.estimator === 'reservoir') {
    return makeSampleAverage();
  }
  else if (opts.estimator === 'velocity') {
    return makeVelocityEstimator(opts.resampleInterval);
  }
  else {
    return unreachable();
  }
}
