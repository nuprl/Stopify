import { RuntimeOpts, AsyncRun } from '../types';
import { Result, Runtime } from '@stopify/continuations-runtime';
import { RuntimeWithSuspend, badResume } from './suspend';
import { makeEstimator } from './makeEstimator';
import { setImmediate } from './setImmediate';

export enum EventProcessingMode {
  Running,
  Paused,
  Waiting
}

type MayYieldState =
    { kind: 'resume' }
  | { kind: 'step', currentLine: number | undefined,
      onStep: (line: number) => void };

type OnYieldState =
    { kind: 'paused', onPaused: (line?: number) => void }
  | { kind: 'pausedAndMayYield' }
  | { kind: 'resume' }
  | { kind: 'step' }

interface EventHandler {
  body: () => void;
  receiver: (x: Result) => void;
}

export abstract class AbstractRunner implements AsyncRun {
  public kind : 'ok' = 'ok';
  public continuationsRTS!: Runtime;
  private suspendRTS!: RuntimeWithSuspend;
  public onDone: (result: Result) => void = (result) => { };
  private onYield: () => void = function() { };
  private onBreakpoint: (line: number) => void = function() { };
  private breakpoints: number[] = [];
  private k: undefined | { k: (x: Result) => any, onDone: (x: Result) => any };
  // The runtime system starts executing the main body of the program.
  protected eventMode = EventProcessingMode.Running;
  private eventQueue: EventHandler[] = [];
  private onYieldFlag: OnYieldState = { kind: 'resume' };
  private mayYieldFlag: MayYieldState =  { kind: 'resume' };

  // The global object for Stopified code.
  public g = Object.create(null);

  constructor(private opts: RuntimeOpts) { }

  private mayYieldRunning(): boolean {
    const n = this.suspendRTS.linenum;
    if (typeof n !== 'number') {
      return false;
    }
    return this.breakpoints.includes(n);
  }

  /**
   * Indirectly called by the stopified program.
   */
  init(rts: Runtime) {
    this.continuationsRTS = rts;
    const estimator = makeEstimator(this.opts);
    this.suspendRTS = new RuntimeWithSuspend(this.continuationsRTS, this.opts.yieldInterval, estimator, () => {
      switch (this.mayYieldFlag.kind) {
        case 'resume':
          return this.mayYieldRunning();
        default: //Step
          // Yield control if the line number changes.
          const maybeLine = this.suspendRTS.linenum;
          if (typeof maybeLine !== 'number' || maybeLine === this.mayYieldFlag.currentLine) {
            return false;
          } else {
            this.mayYieldFlag.onStep(maybeLine);
            return true;
          }
      }
    }, () => {
      if (this.eventMode === EventProcessingMode.Waiting) {
        throw new Error('Stopify internal error: onYield invoked during pause+wait');
      }
      switch (this.onYieldFlag.kind) {
        case 'paused':
          this.onYieldFlag.onPaused(this.suspendRTS.linenum);
          this.onYieldFlag = { kind: 'pausedAndMayYield' };
          return false;
        case 'pausedAndMayYield':
          throw new Error(`onYield called while paused. Do not call .resume()
            in the callback passed to .pause(). Resume in another turn.`);
        case 'resume':
          if (this.mayYieldRunning()) {
            this.onYieldFlag = {
              kind: 'paused',
              onPaused: (line) => {
                if (line === undefined) {
                  throw new Error(`Calling onBreakpoint with undefined as the line`);
                }
                this.onBreakpoint(line);
              }
            };
            this.eventMode = EventProcessingMode.Paused;
            // Invoke the breakpoint handler on the next turn, after the stack
            // is fully reified.
            setImmediate(() =>
              this.onBreakpoint(this.suspendRTS.linenum!));
            return false;
          }
          this.onYield();
          return true;
        default: // Step
          return !this.suspendRTS.mayYield();
      }
    });

    return this;
  }

  /**
   * Called by the stopified program.
   */
  suspend() {
    return this.suspendRTS.suspend();
  }

  /**
   * Called by the stopified program.
   */
  onEnd(result: Result): void {
    this.eventMode = EventProcessingMode.Waiting;
    this.onDone(result);
    this.processQueuedEvents();
  }

  runInit(onDone: (error?: any) => void,
    onYield?: () => void,
    onBreakpoint?: (line: number) => void) {
    if (onYield) {
      this.onYield = onYield;
    }
    if (onBreakpoint) {
      this.onBreakpoint = onBreakpoint;
    }
    this.onDone = onDone;
  }

  abstract run(onDone: (error?: any) => void,
    onYield?: () => void,
    onBreakpoint?: (line: number) => void): void;

  pause(onPaused: (line?: number) => void) {
    if (this.eventMode === EventProcessingMode.Paused) {
      throw new Error('the program is already paused');
    }

    if (this.eventMode === EventProcessingMode.Waiting) {
      onPaused(); // onYield will not be invoked
    } else {
      this.onYieldFlag = { kind: 'paused', onPaused };
    }

    this.eventMode = EventProcessingMode.Paused;
  }

  setBreakpoints(lines: number[]): void {
    this.breakpoints = lines;
  }

  resume() {
    if (this.eventMode === EventProcessingMode.Waiting) {
      return;
    }

    if (this.eventMode === EventProcessingMode.Running) {
      throw new Error(`invokes .resume() while the program is running`);
    }

    // Program was paused, but there was no active continuation.
    if (this.suspendRTS.continuation === badResume) {
      this.eventMode = EventProcessingMode.Waiting;
      this.processQueuedEvents();
    }
    else {
      this.eventMode = EventProcessingMode.Running;
      this.mayYieldFlag = { kind: 'resume' };
      this.onYieldFlag = { kind: 'resume' };
      this.suspendRTS.resumeFromCaptured();
    }
  }

  // NOTE: The program remains Paused while stepping.
  step(onStep: (line: number) => void) {
    if (this.eventMode !== EventProcessingMode.Paused) {
      throw new Error(`step(onStep) requires the program to be paused`);
    }

    this.mayYieldFlag = { kind: 'step', currentLine: this.suspendRTS.linenum, onStep };
    this.onYieldFlag = { kind: 'step' }
    this.suspendRTS.resumeFromCaptured();
  }

  // NOTE: In both of the pause functions below, we don't switch the mode to
  // paused! This is because we don't want the user to be able to hit "step" at
  // this point.

  pauseK(callback: (k: (r: Result) => void) => void): void {
    return this.continuationsRTS.captureCC((k) => {
      return this.continuationsRTS.endTurn(onDone => {
        return callback((x : Result) => {
          return this.continuationsRTS.runtime(() => k(x), onDone);
        });
      });
    });
  }

  pauseImmediate(callback: () => void): void {
    return this.continuationsRTS.captureCC((k) => {
      return this.continuationsRTS.endTurn(onDone => {
        this.k = { k, onDone };
        callback();
      });
    });
  }

  continueImmediate(x: Result): void {
    if (this.k === undefined) {
      throw new Error(`called continueImmediate before pauseImmediate`);
    }
    const { k, onDone } = this.k;
    this.k = undefined;
    return this.continuationsRTS.runtime(() => k(x), onDone);
  }

  externalHOF(body: (complete: (result: Result) => void) => never): void {
    return this.continuationsRTS.captureCC((k) =>
      this.continuationsRTS.endTurn(onDone =>
        body(result =>
          this.continuationsRTS.runtime(() => k(result), onDone))));
  }

  runStopifiedCode(body: () => void, callback: (x: Result) => void): void {
    this.continuationsRTS.runtime(body, callback);
  }

  processEvent(body: () => void, receiver: (x: Result) => void): void {
    this.eventQueue.push({ body, receiver } );
    this.processQueuedEvents();
  }

  private processQueuedEvents() {
    if (this.eventMode !== EventProcessingMode.Waiting) {
      return;
    }

    const eventHandler = this.eventQueue.shift();
    if (eventHandler === undefined) {
      return;
    }
    const { body, receiver } = eventHandler;
    this.eventMode = EventProcessingMode.Running;
    this.continuationsRTS.runtime(body, (result) => {
      this.eventMode = EventProcessingMode.Waiting;
      receiver(result);
      this.processQueuedEvents();
    });
  }
}
