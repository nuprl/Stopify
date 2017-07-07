const assert = require('assert');

// The type of continuation frames
type KFrame = KFrameTop | KFrameRest;

interface KFrameTop {
  kind: 'top';
  f: () => any;
}

interface KFrameRest {
  kind: 'rest';
  f: () => any;   // The function we are in
  locals: any[];  // All locals and parameters
  index: number;  // At this application index
}

type Stack = KFrame[];

// The type of execution mode, whether normally computing or restoring state
// from a captured `Stack`.
type Mode = NormalMode | RestoringMode;

interface NormalMode {
  kind: 'normal';
}

interface RestoringMode {
  kind: 'restoring';
  stack: Stack;
}

let mode: Mode = {
  kind: 'normal',
};

// We throw this exception when a continuation value is applied. i.e.,
// callCC applies its argument to a function that throws this exception.
class RestoreCont {
  constructor(public stack: Stack) {}
}

// We throw this exception to capture the current continuation. i.e.,
// callCC throws this exception when it is applied.
class Capture {
  constructor(public f: (k: any) => any, public stack: Stack) {}
}

function callCC(f: (k: any) => any) {
  throw new Capture(f, []);
}

// Helper function that constructs a top-of-stack frame.
function topK(f: () => any): KFrameTop {
  return {
    kind: 'top',
    f: () => {
      mode = {
        kind: 'normal',
      };
      return f();
    }
  };
}

// Wraps a stack in a function that throws an exception to discard the current
// continuation. The exception carries the provided stack with a final frame
// that returns the supplied value.
function makeCont(stack: Stack) {
  return function (v: any) {
    throw new RestoreCont([...stack,
      topK(() => v)]);
  }
}

function restore(stack: KFrame[]): any {
  assert(stack.length > 0)
  mode = {
    kind: 'restoring',
    stack: stack,
  };
  stack[0].f();
}
