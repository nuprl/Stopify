import * as common from './runtime';
export * from './runtime';

export let stack: common.Stack = [];
export let mode: common.Mode = 'normal';

export function callCC(f: (k: any) => any): common.Capture {
  return new common.Capture(f, []);
}

export function makeCont(stack: common.Stack): (v: any) => common.Restore {
  return function (v: any) {
    return new common.Restore([topK(() => v), ...stack]);
  }
}

// Helper function that constructs a top-of-stack frame.
export function topK(f: () => any): common.KFrameTop {
  return {
    kind: 'top',
    f: () => {
      stack = [];
      mode = 'normal';
      return f();
    }
  };
}

export function restore(aStack: common.Stack): any {
  if (aStack.length === 0) {
    throw new Error(`Can't restore from empty stack`);
  }
  mode = 'restoring';
  stack = aStack;
  return stack[stack.length - 1].f();
}

export function runtime(body: any): any {
  if (body instanceof Function) {
    let res = body();
    if (res instanceof common.Capture) {
      // Recursive call to runtime addresses nested continuations. The return
      // statement ensures that the invocation is in tail position.
      // At this point, res.stack is the continuation of callCC, but doesn’t have
      // a top-of-stack frame that actually restores the saved continuation. We
      // need to apply the function passed to callCC to the stack here, because
      // this is the only point where the whole stack is ready.
      return runtime(() =>
        // Doing res.f makes "this" wrong.
        restore([topK(() => res.f.call(global, makeCont(res.stack))), ...res.stack]));
    } else if (res instanceof common.Restore) {
      // The current continuation has been discarded and we now restore the
      // continuation in res.
      return runtime(() =>
        restore([...res.stack]));
    }

    return res;
  } else if (body instanceof common.Restore) {
    // The current continuation has been discarded and we now restore the
    // continuation in body.
    return runtime(() =>
      restore([...body.stack]));
  }
}

export const knownBuiltIns = [Object, Function, Boolean, Symbol, Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError, Number, Math, Date, String, RegExp, Array, Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, Map, Set, WeakMap, WeakSet];

export function handleNew(constr: any, ...args: any[]) {
  if (knownBuiltIns.includes(constr)) {
    return new constr(...args);
  }

  let obj;
  if (mode === "normal") {
    obj = Object.create(constr.prototype);
  } else {
    const frame = stack[stack.length - 1];
    if (frame.kind === "rest") {
      [obj] = frame.locals;
    } else {
      throw "bad";
    }
    stack.pop();
  }

  if (mode === "normal") {
    let _a = constr.apply(obj, args);
    if (_a instanceof common.Capture) {
      _a.stack.push({
        kind: "rest",
        f: () => handleNew(constr, ...args) ,
        locals: [obj],
        index: 0
      });
      return _a;
    } else if (_a instanceof common.Restore) {
      return _a;
    }
  }
  else {
    let _a = stack[stack.length - 1].f.apply(obj, []);
    if (_a instanceof common.Capture) {
      _a.stack.push({
        kind: "rest",
        f: () => handleNew(constr, ...args) ,
        locals: [obj],
        index: 0
      });
      return _a;
    } else if (_a instanceof common.Restore) {
      return _a;
    }
  }
  return obj;
}

let countDown: number | undefined;

export function resume(result: any) {
  return setTimeout(() => runtime(result), 0);
}

export function suspend(interval: number, top: any): any {
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

