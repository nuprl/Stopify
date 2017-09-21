export type Stoppable = (isStop: () => boolean,
                         onStop: () => void,
                         onDone: () => void,
                         opts: Opts) => void

export type ElapsedTimeEstimatorName = 'exact' | 'reservoir' | 'countdown';

export interface Opts {
  transform: 'eager' | 'lazy' | 'retval' | 'original',
  filename: string,
  estimator: ElapsedTimeEstimatorName;
  yieldInterval: number,
  timePerElapsed: number,
  stop: number | undefined,
  variance: boolean,
  env: 'firefox' | 'chrome' | 'node',
}
