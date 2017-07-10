import * as R from '../../src/callcc/runtime';

const initialGas = 10000000;
let GAS: number = 0;
function decrGAS() { return 1; }

const n = 100000000;
let a = n;
let b = 0;

function loop(f: any) {
  let step = 0;
  let ans;

  let i = 0;
  try {
    if (R.mode.kind === 'restoring') {
      const ar = <R.KFrameRest>R.mode.stack.pop();
      step = ar.index;
      ans = ar.locals[2];
      f = ar.locals[0];
      i = ar.locals[1];
    }
    if (decrGAS() <= 0) {
      R.callCC(R.makeCont([]));
    }
    while (true) {
      switch (step) {
        case 0:
          step = i++ < n ? 1 : 2;
          break;
        case 1:
          step = 0;
          ans = f();
          break;
        case 2:
          return;
      }
    }
  } catch (exn) {
    if (exn instanceof R.Capture) {
      exn.stack.push({
        kind: 'rest',
        f: function () { return loop(f); },
        locals: [f, i],
        index: step,
      });
    }
    throw exn;
  }
}

function f() {
  let step = 0;
  let ans;

  let s, t;
  try {
    if (R.mode.kind === 'restoring') {
      const ar = <R.KFrameRest>R.mode.stack.pop();
      step = ar.index;
      ans = ar.locals[2];
      s = ar.locals[0];
      t = ar.locals[1];
    }
    if (decrGAS() <= 0) {
      R.callCC(R.makeCont([]));
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
    if (exn instanceof R.Capture) {
      exn.stack.push({
        kind: 'rest',
        f: f,
        index: step,
        locals: [s, t, ans],
      });
    }
    throw exn;
  }
}

function g() {
  let step = 0;
  let ans;

  try {
    if (R.mode.kind === 'restoring') {
      const ar = <R.KFrameRest>R.mode.stack.pop();
      step = ar.index;
      ans = ar.locals[0];
    }
    if (decrGAS() <= 0) {
      R.callCC(R.makeCont([]));
    }
    while (true) {
      switch (step) {
        case 0:
          return --a;
      }
    }
  } catch (exn) {
    if ((exn instanceof R.Capture)) {
      exn.stack.push({
        kind: 'rest',
        f: g,
        index: step,
        locals: [ans],
      });
    }
    throw exn;
  }
}

function h() {
  let step = 0;
  let ans;

  try {
    if (R.mode.kind === 'restoring') {
      const ar = <R.KFrameRest>R.mode.stack.pop();
      step = ar.index;
      ans = ar.locals[0];
    }
    if (decrGAS() <= 0) {
      R.callCC(R.makeCont([]));
    }
    while (true) {
      switch (step) {
        case 0:
          return ++b;
      }
    }
  } catch (exn) {
    if ((exn instanceof R.Capture)) {
      exn.stack.push({
        kind: 'rest',
        f: h,
        index: step,
        locals: [ans],
      });
    }
    throw exn;
  }
}

console.log('Starting loop...');
const begin = Date.now();
R.runtime(function () { return loop(f); });
const after = (Date.now() - begin) / 1000;
console.log('Loop:\t' + after + 's');
