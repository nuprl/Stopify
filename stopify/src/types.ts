import { Result } from 'stopify-continuations/dist/src/types';
export { Result };
export { HandleNew, CaptureMethod, CompilerOpts } from 'stopify-continuations';

export type Stoppable = (isStop: () => boolean,
                         onStop: () => void,
                         onDone: () => void,
                         opts: RuntimeOpts) => void;

export type ElapsedTimeEstimatorName = 'exact' | 'reservoir' | 'velocity' | 'interrupt' | 'countdown';

export interface RuntimeOpts {
  filename: string,
  estimator: ElapsedTimeEstimatorName;
  yieldInterval: number,
  resampleInterval: number,
  timePerElapsed: number,
  stop: number | undefined,
  variance: boolean,
  stackSize: number,
  restoreFrames: number,

  /** These are strings that Selenium recognizes, which is why it says
   * 'MicrosoftEdge' instead of 'edge'.
   */
  env: 'firefox' | 'chrome' | 'node' | 'MicrosoftEdge' | 'safari'
}

export interface AsyncRun {
  run(onDone: (result: Result) => void,
    onYield?: () => void,
    onBreakpoint?: (line: number) => void): void;
  pause(onPaused: (line?: number) => void): void;
  resume(): void;
  setBreakpoints(line: number[]): void;
  step(onStep: (line: number) => void): void;
  pauseImmediate(callback: () => void): void;
  continueImmediate(result: any): void;
  processEvent(body: () => any, receiver: (x: Result) => void): void;
}
