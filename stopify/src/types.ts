import { HandleNew, CaptureMethod, CompilerOpts }
  from 'stopify-continuations';
export { HandleNew, CaptureMethod, CompilerOpts } from 'stopify-continuations';

export type Stoppable = (isStop: () => boolean,
                         onStop: () => void,
                         onDone: () => void,
                         opts: Opts) => void

export type ElapsedTimeEstimatorName = 'exact' | 'reservoir' | 'countdown';

export interface Opts {
  filename: string,
  estimator: ElapsedTimeEstimatorName;
  yieldInterval: number,
  resampleInterval: number,
  timePerElapsed: number,
  stop: number | undefined,
  variance: boolean,
  /** These are strings that Selenium recognizes, which is why it says
   * 'MicrosoftEdge' instead of 'edge'.
   */
  env: 'firefox' | 'chrome' | 'node' | 'MicrosoftEdge' | 'safari'
}

export interface AsyncRun {
  run(onDone: () => void, onYield?: () => void): void;
  pause(onPaused: () => void): void;
  resume(): void;
}