import { RuntimeOpts, AsyncRun } from '../types';
import { Result, Runtime } from 'stopify-continuations';
import { RuntimeWithSuspend, badResume } from './suspend';
import { makeEstimator } from './makeEstimator';

export enum EventProcessingMode {
  Running,
  Paused,
  Waiting
}

const enum mayYieldState {
  Resume,
  Step
}

const enum onYieldState {
  Paused,
  PausedAndMayYield,
  PausedAndWaiting,
  Resume,
  Step
}

interface EventHandler {
  body: () => void;
  receiver: (x: Result) => void;
}

export abstract class AbstractRunner implements AsyncRun {
  public kind : 'ok' = 'ok';
  public continuationsRTS: Runtime;
  private suspendRTS: RuntimeWithSuspend;
  public onDone: (result: Result) => void = (result) => { };
  private onYield: () => void = function() { };
  private onBreakpoint: (line: number) => void = function() { };
  private breakpoints: number[] = [];
  private k: undefined | { k: (x: Result) => any, onDone: (x: Result) => any };
  // The runtime system starts executing the main body of the program.
  protected eventMode = EventProcessingMode.Running;
  private eventQueue: EventHandler[] = [];
  private higherOrderFunctions: any;

  private onYieldFlag: onYieldState = onYieldState.Resume;
  private mayYieldFlag: mayYieldState = mayYieldState.Resume;
  private captureCurrentLine: number | undefined;
  private captureOnPausedFn: (line?: number) => void;
  private captureOnStepFn: (line: number) => void;

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

  private onYieldRunning() {
    if (this.mayYieldRunning()) {
      this.onBreakpoint(this.suspendRTS.linenum!);
      return false;
    }
    else {
      this.onYield();
      return true;
    }
  }

  stopifyArray(arr: Array<any>) {
    return this.higherOrderFunctions.stopifyArray(arr);
  }

  /**
   * Indirectly called by the stopified program.
   */
  init(rts: Runtime) {
    this.continuationsRTS = rts;
    const estimator = makeEstimator(this.opts);
    this.suspendRTS = new RuntimeWithSuspend(this.continuationsRTS, this.opts.yieldInterval, estimator, () => {
      if(this.mayYieldFlag === mayYieldState.Resume) {
       return this.mayYieldRunning();
      } else { //Step
        // Yield control if the line number changes.
        const maybeLine = this.suspendRTS.linenum;
        if (typeof maybeLine !== 'number' || maybeLine === this.captureCurrentLine) {
          return false;
        } else {
          this.captureOnStepFn(maybeLine);
          return true;
        }
      }
    }, () => {
      if(this.onYieldFlag === onYieldState.Paused) {
        this.onYieldFlag = onYieldState.PausedAndMayYield;
        this.captureOnPausedFn(this.suspendRTS.linenum);
        return false;
      } else if(this.onYieldFlag === onYieldState.PausedAndMayYield) {
        return this.mayYieldRunning();
      } else if(this.onYieldFlag === onYieldState.PausedAndWaiting) {
        throw new Error('Stopify internal error: onYield invoked during pause+wait');
      } else if(this.onYieldFlag === onYieldState.Resume) {
        return this.onYieldRunning();
      } else { // Step
        // Pause if the line number changes.
        return !this.suspendRTS.mayYield();
      }
    });

    // We use require because this module requires Stopify to be loaded before
    // it is loaded. A top-level import would not work.
    this.higherOrderFunctions = require(`../stopified/higherOrderFunctions.${this.continuationsRTS.kind}`);
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
      this.onYieldFlag = onYieldState.PausedAndWaiting;
      onPaused(); // onYield will not be invoked
    }
    else {
      this.captureOnPausedFn = onPaused;
      this.onYieldFlag = onYieldState.Paused;
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
      this.mayYieldFlag = mayYieldState.Resume;
      this.onYieldFlag = onYieldState.Resume;
      this.suspendRTS.resumeFromCaptured();
    }
  }

  // NOTE: The program remains Paused while stepping.
  step(onStep: (line: number) => void) {
    if (this.eventMode !== EventProcessingMode.Paused) {
      throw new Error(`step(onStep) requires the program to be paused`);
    }

    this.captureCurrentLine = this.suspendRTS.linenum;
    this.captureOnStepFn = onStep;
    this.mayYieldFlag = mayYieldState.Step;
    this.onYieldFlag = onYieldState.Step;
    this.suspendRTS.resumeFromCaptured();
  }

  pauseImmediate(callback: () => void): void {
    // NOTE: We don't switch the mode to paused! This is because we don't want
    // the user to be able to hit "step" at this point.
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
