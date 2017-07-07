import * as pyret from './pyret-runtime';

const n = 100000000;
let a = n;
let b = 0;

function loop(f: Function) {
  let step = 0;
  let ans;

  let i = 0;
  try {
    if (pyret.isActivationRecord(f)) {
      var ar = f;
      step = ar.step;
      ans = ar.ans;
      f = ar.args[0];
      i = ar.vars[0];
    }
    if (pyret.decrGAS() <= 0) {
      throw pyret.makeCont();
    }
    while (true) {
      switch (step) {
        case 0:
          step = 1;
          ans = f();
          break;
        case 1:
          i++;
          step = i < n ? 0 : 2;
          break;
        case 2:
          return;
      }
    }
  } catch (exn) {
    if (exn instanceof pyret.ContinuationExn) {
      exn.stack.push(pyret.makeActivationRecord(
        loop,
        step,
        [f],
        [i]));
    }
    throw exn;
  }
}

function f(frame?: pyret.ActivationRecord) {
  let step = 0;
  let ans;

  let s, t;
  try {
    if (pyret.isActivationRecord(frame)) {
      var ar = frame;
      step = ar.step;
      ans = ar.ans;
      s = ar.vars[0];
      t = ar.vars[1];
    }
    if (pyret.decrGAS() <= 0) {
      throw pyret.makeCont();
    }
    while (true) {
      switch (step) {
        case 0:
          step = 1;
          ans = g();
          break;
        case 1:
          s = ans;
          step = 2;
          ans = h();
          break;
        case 2:
          t = ans;
          step = 3;
          ans = s + t;
          break;
        case 3:
          return ans;
      }
    }
  } catch (exn) {
    if (exn instanceof pyret.ContinuationExn) {
      exn.stack.push(pyret.makeActivationRecord(
        f,
        step,
        [],
        [s, t]));
    }
    throw exn;
  }
}

function g(frame?: pyret.ActivationRecord) {
  let step = 0;
  let ans;

  try {
    if (pyret.isActivationRecord(frame)) {
      var ar = frame;
      step = ar.step;
      ans = ar.ans;
    }
    if (pyret.decrGAS() <= 0) {
      throw pyret.makeCont();
    }
    while (true) {
      switch (step) {
        case 0:
          return --a;
      }
    }
  } catch (exn) {
    if ((exn instanceof pyret.ContinuationExn)) {
      exn.stack.push(pyret.makeActivationRecord(
        g,
        step,
        [],
        []));
    }
    throw exn;
  }
}

function h(frame?: pyret.ActivationRecord) {
  let step = 0;
  let ans;

  try {
    if (pyret.isActivationRecord(frame)) {
      var ar = frame;
      step = ar.step;
      ans = ar.ans;
    }
    if (pyret.decrGAS() <= 0) {
      throw pyret.makeCont();
    }
    while (true) {
      switch (step) {
        case 0:
          return ++b;
      }
    }
  } catch (exn) {
    if (exn instanceof pyret.ContinuationExn) {
      exn.stack.push(pyret.makeActivationRecord(
        h,
        step,
        [],
        []));
    }
    throw exn;
  }
}

console.log('Starting loop...');
const beginVanilla = Date.now();
pyret.run(pyret.makeActivationRecord(loop, 0, [f], [0]));
const afterVanilla = (Date.now() - beginVanilla) / 1000;
console.log('Loop:\t' + afterVanilla + 's');
