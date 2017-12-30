import { Opts } from '../types';
import { unreachable } from '../generic';

/**
 * Interface for an object that estimates elapsed time.
 */
export interface ElapsedTimeEstimator {
  /**
   * See 'elapsedTime' documentation.
   */
  reset(): void,
  /** Produces an estimate of time elapsed, in milliseconds, since the last
   * application of 'reset' or since the object was created.
   */
  elapsedTime(): number
}

class ExactTimeEstimator implements ElapsedTimeEstimator {
  public constructor(private last = Date.now()) { }

  reset() {
    this.last = Date.now();
  }

  elapsedTime(): number {
    return Date.now() - this.last;
  }
}

/**
 * Checks the current time whenever 'elapsedTime' is applied, instead of 
 * estimating the elapsed time.
 */
export function makeExact(): ElapsedTimeEstimator {
  return new ExactTimeEstimator();
}

class CountdownTimeEstimator implements ElapsedTimeEstimator {
  public constructor(
    private timePerElapsed: number,
    private i = 0) {
  }

  reset() {
    this.i = 0;
  }

  elapsedTime(): number {
    this.i++;
    return this.i * this.timePerElapsed;
  }
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

/** Draws a number from a geometric distribution. */
function geom(p: number): number { 
  return Math.ceil(Math.log(1 - Math.random()) / Math.log(1 - p)); 
}

class SampleAverageTimeEstimator implements ElapsedTimeEstimator {

  constructor(
    // total calls to elapsedTime
    private i = 1,
    // last value produced by Date.now()
    private last = Date.now(),
    // time between successive calls to elapsedTime
    private timePerElapsed = 100,
    // these many calls to elapsedTime between observations of time
    private countDownFrom = geom(1 / i),
    // countdown until we re-observe the time
    private countDown = countDownFrom,
    // number of times elapsedTime has been invoked since last reset
    private elapsedTimeCounter = 0) {
  }

  elapsedTime() {
    this.i = (this.i + 1) | 0;
    this.elapsedTimeCounter = (this.elapsedTimeCounter + 1) | 0;
    if (this.countDown-- === 0) {
      const now = Date.now();
      this.timePerElapsed = (now - this.last) / this.countDownFrom;
      this.last = now;
      this.countDownFrom = geom(1 / this.i);
      this.countDown = this.countDownFrom;
    }

    return this.timePerElapsed * this.elapsedTimeCounter;
  }

  reset() {
    this.elapsedTimeCounter = 0;
  }
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

class VelocityEstimator implements ElapsedTimeEstimator {

  constructor(
    // Expected distance between resamples (units: time)
    public resample: number,
    // total calls to elapsedTime
    private i = 1,
    // Units: time
    private lastPosition = Date.now(),
    // Units: time / #elapsedTime
    private velocityEstimate = 100000,
    // Units: #elapsedTime;
    private resampleTimespanEstimate = velocityEstimate,
    // countdown until we re-observe the time
    private countDown = 1,
    // Distance since last reset. Units: #elapsedTime
    private distance = 0) {
  }

  elapsedTime() {
    this.i = (this.i + 1) | 0;
    this.distance = (this.distance + 1) | 0;
    if (this.countDown-- === 0) {
      const currentPosition = Date.now();
      // NOTE(arjun): This is a small float. It may be a good idea to scale
      // everything up to an integer.
      this.velocityEstimate = this.resampleTimespanEstimate / (currentPosition - this.lastPosition);
      this.lastPosition = currentPosition;
      this.resampleTimespanEstimate = Math.max((this.resample * this.velocityEstimate) | 0, 10);
      this.countDown = this.resampleTimespanEstimate;
    }
    return (this.distance / this.velocityEstimate) | 0;
  }

  reset() {
    this.distance = 0;
  }
}

/**
 * Estimates 'elapsedTime' by periodically resampling the current time.
 *
 * @param resample Period between resamples.
 */
export function makeVelocityEstimator(resample: number = 100): ElapsedTimeEstimator {
  return new VelocityEstimator(resample);
}

export function makeEstimator(opts: Opts): ElapsedTimeEstimator {
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
