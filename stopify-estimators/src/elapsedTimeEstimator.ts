/**
 * Interface for an object that estimates elapsed time.
 */
export abstract class ElapsedTimeEstimator {
  /**
   * See 'elapsedTime' documentation.
   */
  abstract reset(): void;
  /** Produces an estimate of time elapsed, in milliseconds, since the last
   * application of 'reset' or since the object was created.
   */
  abstract elapsedTime(): any;
  /**
   * Clean up any necessary state. Called from the runtime's `onEnd` function.
   */
  cancel(): void { }
}

export class ExactTimeEstimator extends ElapsedTimeEstimator {
  public constructor(private last = Date.now()) {
    super();
  }

  reset() {
    this.last = Date.now();
  }

  elapsedTime(): number {
    return Date.now() - this.last;
  }
}

export class CountdownTimeEstimator extends ElapsedTimeEstimator {
  public constructor(
    private timePerElapsed: number,
    private i = 0) {
    super();
  }

  reset() {
    this.i = 0;
  }

  elapsedTime(): number {
    this.i++;
    return this.i * this.timePerElapsed;
  }
}

/** Draws a number from a geometric distribution. */
function geom(p: number): number {
  return Math.ceil(Math.log(1 - Math.random()) / Math.log(1 - p));
}

export class SampleAverageTimeEstimator extends ElapsedTimeEstimator {

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
    super();
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

export class VelocityEstimator extends ElapsedTimeEstimator {

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
    super();
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
