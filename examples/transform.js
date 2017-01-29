/** Exception to signal frame capture
 */
class CaptureException {
  constructor(callccFunction, kont) {
    this.callccFunction = callccFunction;
    this.kont = kont;
  }

  getParams() {
    return [this.callccFunction, this.kont];
  }
}

function f(a, b) {
  function r0(v1, v2) { return v1 + v2; }

  function r1(v1) {
    let v2;
    try {
      v2 = b(1);
    } catch (e) {
      if (e instanceof CaptureException) {
        const [v, k] = e.getParams();
        throw new CaptureException(v, x => r0(v1, k(x)));
      } else {
        throw e;
      }
    }
    return r0(v1, v2);
  }

  let v1;
  try {
    v1 = a(0);
  } catch (e) {
    if (e instanceof CaptureException) {
      const [v, k] = e.getParams();
      throw new CaptureException(v, x => r1(k(x)));
    }
    else {
      throw e;
    }
  }

  return r1(v1);
}

function callCC(fun) {
  throw new CaptureException(fun, x => x);
}

/** Exception to signal the result
 */

class Result {
  constructor(ans) {
    this.ans = ans;
  }

  getAns() {
    return this.ans;
  }
}

/**
 * body must be a no argument function
 */
function topLevel(body) {
  try {
    throw new Result(body());
  } catch (e) {
    if (e instanceof CaptureException) {
      const [, k] = e.getParams();
      topLevel(() => k(f(x => topLevel(() => k(x)))));
    } else {
      throw e;
    }
  }
}

/**
 * body must be a no argument function
 */
function main(body) {
  try {
    return topLevel(body);
  } catch (e) {
    if (e instanceof Result) {
      return e.ans;
    }
    else throw e;
  }
}

function test1() {
  return main(() => f(x => x, x => x));
}

function test2() {
  return main(() => f(x => callCC(k => 100 + k(x)), x => x));
}

function test3() {
  return main(() => callCC(kt => f(x => callCC(k => 100 + kt(x)), x => x)));
}

// console.log(test1());
console.log(test2());
console.log(test3());
