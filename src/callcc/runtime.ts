// The type of continuation frames
export type KFrame = KFrameTop | KFrameRest;

export interface KFrameTop {
  kind: 'top';
  f: () => any;
}

export interface KFrameRest {
  kind: 'rest';
  f: () => any;   // The function we are in
  locals: any[];  // All locals and parameters
  index: number;  // At this application index
}

export type Stack = KFrame[];

// The type of execution mode, whether normally computing or restoring state
// from a captured `Stack`.
export type Mode = 'normal' | 'restoring';

// We throw this exception when a continuation value is applied. i.e.,
// captureCC applies its argument to a function that throws this exception.
export class Restore {
  constructor(public stack: Stack) {}
}

// We throw this exception to capture the current continuation. i.e.,
// captureCC throws this exception when it is applied. This class needs to be
// exported because source programs are instrumented to catch it.
export class Capture {
  constructor(public f: (k: any) => any, public stack: Stack) {}
}

declare function callCC(f: (k: any) => any): void;
declare function topK(f: () => any): KFrameTop;
// Wraps a stack in a function that throws an exception to discard the current
// continuation. The exception carries the provided stack with a final frame
// that returns the supplied value.
declare function makeCont(stack: Stack): (v: any) => any;
declare function restore(aStack: Stack): any;
declare function runtime(body: () => any): any;
declare function handleNew(constr: any, ...args: any[]): any;
declare function resume(result: any): any;
declare function suspend(interval: number, top: any): void;
