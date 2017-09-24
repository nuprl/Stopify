export type Stoppable = (isStop: () => boolean,
                         onStop: () => void,
                         onDone: () => void,
                         opts: Opts) => void

export type ElapsedTimeEstimatorName = 'exact' | 'reservoir' | 'countdown';
export type CaptureMethod = 'eager' | 'retval' | 'lazy' | 'original'
export type HandleNew = 'direct' | 'wrapper'

export interface Opts {
  transform: CaptureMethod,
  filename: string,
  estimator: ElapsedTimeEstimatorName;
  yieldInterval: number,
  timePerElapsed: number,
  stop: number | undefined,
  variance: boolean,
  env: 'firefox' | 'chrome' | 'node',
}
