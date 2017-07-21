const assert = require('assert');

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

export let stack: Stack = [];
export let mode: Mode = 'normal';


// We throw this exception when a continuation value is applied. i.e.,
// callCC applies its argument to a function that throws this exception.
export class Restore {
  constructor(public stack: Stack) {}
}

// We throw this exception to capture the current continuation. i.e.,
// callCC throws this exception when it is applied.
export class Capture {
  constructor(public f: (k: any) => any, public stack: Stack) {}
}

export function callCC(f: (k: any) => any) {
  throw new Capture(f, []);
}

// Helper function that constructs a top-of-stack frame.
export function topK(f: () => any): KFrameTop {
  return {
    kind: 'top',
    f: () => {
      stack = [];
      mode = 'normal';
      return f();
    }
  };
}

// Wraps a stack in a function that throws an exception to discard the current
// continuation. The exception carries the provided stack with a final frame
// that returns the supplied value.
export function makeCont(stack: Stack) {
  return function (v: any) {
    throw new Restore([topK(() => v), ...stack]);
  }
}

export function restore(aStack: KFrame[]): any {
  assert(aStack.length > 0);
  mode = 'restoring';
  stack = aStack;
  stack[stack.length - 1].f();
}

export function runtime(body: () => any): any {
  try {
    body();
  }
  catch (exn) {
    if (exn instanceof Capture) {
      // Recursive call to runtime addresses nested continuations. The return
      // statement ensures that the invocation is in tail position.
      // At this point, exn.stack is the continuation of callCC, but doesn’t have
      // a top-of-stack frame that actually restores the saved continuation. We
      // need to apply the function passed to callCC to the stack here, because
      // this is the only point where the whole stack is ready.
      return runtime(() =>
                     // Doing exn.f makes "this" wrong.
                     restore([topK(() => exn.f.call(global, makeCont(exn.stack))), ...exn.stack]));
    }
    else if (exn instanceof Restore) {
      // The current continuation has been discarded and we now restore the
      // continuation in exn.
      return runtime(() =>
        restore([...exn.stack]));
    }
    else {
      throw exn; // userland exception
    }
  }
}

const knownBuiltIns = [Object, Function, Boolean, Symbol, Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError, Number, Math, Date, String, RegExp, Array, Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, Map, Set, WeakMap, WeakSet];

export function handleNew(constr: any, ...args: any[]) {
  if (knownBuiltIns.includes(constr)) {
    return new constr(...args);
  }

  let obj;
  if (mode === "normal") {

    obj = Object.create(constr.prototype);
  }
  else {
    const frame = stack[stack.length - 1];
    if (frame.kind === "rest") {
      [obj] = frame.locals;
    }
    else {
      throw "bad";
    }
    stack.pop();
  }

  try {
    if (mode === "normal") {
      constr.apply(obj, args);
    }
    else {
     stack[stack.length - 1].f.apply(obj, []);
    }
  }
  catch (exn) {
    if (exn instanceof Capture) {
      exn.stack.push({
        kind: "rest",
        f: () => handleNew(constr, ...args) ,
        locals: [obj],
        index: 0
      });
    }
    throw exn;
  }
  return obj;
}

let countDown: number | undefined;

export function suspend(interval: number, top: any) {
  if (Number.isNaN(interval)) {
    return;
  }
  if (countDown === undefined) {
    countDown = interval;
  }
  if (--countDown === 0) {
    countDown = interval;
    return callCC(top);
  }
}
