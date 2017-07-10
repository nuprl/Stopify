import * as R from '../../src/callcc/runtime';

function decrGAS() { return 1; }

const n = 30000;

function loop(f: Function) {
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
          ans = f(i);
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

function sum(i: number, acc: number): number {
  let step = 0;
  let ans;

  if (R.mode.kind === 'restoring') {
    const ar = <R.KFrameRest>R.mode.stack.pop();
    step = ar.index;
    ans = ar.locals[1];
  }
  if (decrGAS() <= 0) {
    R.callCC(R.makeCont([]));
  }
  while (true) {
    switch (step) {
      case 0:
        step = i === 0 ? 1 : 2;
        break;
      case 1:
        return acc;
      case 2:
        return sum(i-1, acc+i);
    }
  }
}

console.log('Starting loop...');
const begin = Date.now();
R.runtime(function () { return loop(sum); });
const after = (Date.now() - begin) / 1000;
console.log('Loop:\t' + after + 's');
