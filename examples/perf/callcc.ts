import * as assert from 'assert';
import * as R from '../../src/callcc/runtime';

const n = 100000000;
let a = n;
let b = 0;

function loop(f: any) {
  let i = 0, _t, target;
  if (R.mode.kind === 'restoring') {
    const frame = <R.KFrameRest>R.mode.stack[0];
    assert(frame.kind === 'rest');
    assert(frame.f === loop);

    let locals = frame.locals;
    i = locals[0];

    target = frame.index;
    R.mode.stack.pop();
  }

  // Original:
  // while (i++ < n) { f(); }
  while ((R.mode.kind === 'restoring' && target === 0) ||
    (R.mode.kind === 'normal' && (i++ < n))) {
    try {
      if (R.mode.kind === 'normal') {
        _t = f();
      } else if (R.mode.kind === 'restoring' && target === 0) {
        _t = R.mode.stack[0].f();
      }
    } catch (exn) {
      if (exn instanceof R.Capture) {
        exn.stack.push({
          kind: 'rest',
          f: function () { return loop(f); },
          locals: [i],
          index: 0,
        });
      }
      throw exn;
    }
  }
}

function f() {
  let s, t, target;
  if (R.mode.kind === 'restoring') {
    const frame = <R.KFrameRest>R.mode.stack[0];
    assert(frame.kind === 'rest');
    assert(frame.f === f);

    let locals = frame.locals;
    s = locals[0];
    t = locals[1];

    target = frame.index;
    R.mode.stack.pop();
  }

  // Original:
  // return g() + h();
  if (R.mode.kind === 'normal' ||
    (R.mode.kind === 'restoring' && target === 1)) {
    try {
      if (R.mode.kind === 'normal') {
        s = g();
      } else if (R.mode.kind === 'restoring' && target === 1) {
        s = R.mode.stack[0].f();
      }
    } catch (exn) {
      if (exn instanceof R.Capture) {
        exn.stack.push({
          kind: 'rest',
          f: function () { return g(); },
          locals: [s, t],
          index: 1,
        });
      }
      throw exn;
    }
  }
  if (R.mode.kind === 'normal' ||
    (R.mode.kind === 'restoring' && target === 2)) {
    try {
      if (R.mode.kind === 'normal') {
        t = h();
      } else if (R.mode.kind === 'restoring' && target === 2) {
        t = R.mode.stack[0].f();
      }
    } catch (exn) {
      if (exn instanceof R.Capture) {
        exn.stack.push({
          kind: 'rest',
          f: function () { return h(); },
          locals: [s, t],
          index: 2,
        });
      }
      throw exn;
    }
  }
  return s + t;
}

function g() {
  return --a;
}

function h() {
  return ++b;
}

console.log('Starting loop...');
const begin = Date.now();
R.runtime(function () { return loop(f); });
const after = (Date.now() - begin) / 1000;
console.log('Loop:\t' + after + 's');

