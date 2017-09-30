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
