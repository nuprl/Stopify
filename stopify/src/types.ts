export { HandleNew, CaptureMethod, CompilerOpts } from 'stopify-continuations';

export type Stoppable = (isStop: () => boolean,
                         onStop: () => void,
                         onDone: () => void,
                         opts: RuntimeOpts) => void

export type ElapsedTimeEstimatorName = 'exact' | 'reservoir' | 'countdown';

export interface RuntimeOpts {
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
  run(onDone: () => void,
    onYield?: () => void,
    onBreakpoint?: (line: number) => void): void;
  pause(onPaused: (line?: number) => void): void;
  resume(): void;
  setBreakpoints(line: number[]): void;
  step(onStep: (line: number) => void): void;
}
