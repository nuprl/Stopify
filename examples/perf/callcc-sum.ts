import * as assert from 'assert';
import * as R from '../../src/callcc/runtime';

const n = 30000;

function loop(f: Function) {
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
        _t = f(i, 0);
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

function sum(i: number, acc: number): number {
  let _t, target;
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
  // if (i === 0) { return acc; } else { return sum(i-1, acc+i) }
  if (R.mode.kind === 'normal' && i === 0) {
    return acc;
  } else if ((R.mode.kind === 'restoring' && target === 0) ||
    R.mode.kind === 'normal') {
    if (R.mode.kind === 'normal') {
      return sum(i-1, acc+i);
    } else if (R.mode.kind === 'restoring' && target === 0) {
      return R.mode.stack[0].f();
    }
  }
  // unreachable
  assert(false);
  return 0;
};

console.log('Starting loop...');
const begin = Date.now();
R.runtime(function () { return loop(sum); });
const after = (Date.now() - begin) / 1000;
console.log('Loop:\t' + after + 's');


