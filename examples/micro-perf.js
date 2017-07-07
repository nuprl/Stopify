const n = 100000000;
let a = n;
let b = 0;

function plain_f() {
  return g() + h() + i() + j();
}

function fsm_f() {
  let step = 0;
  let ans;

  let a, b, c, d;
  while (true) {
    switch (step) {
      case 0:
        step = 1;
        ans = g();
        break;
      case 1:
        a = ans;
        step = 2;
        ans = h();
        break;
      case 2:
        b = ans;
        step = 3;
        ans = i();
        break;
      case 3:
        c = ans;
        step = 4;
        ans = j();
        break;
      case 4:
        d = ans;
        step = 5;
        ans = a + b + c + d;
        break;
      case 5:
        return ans;
    }
  }
}

function fsm_try_f() {
  let step = 0;
  let ans;

  let a, b, c, d;
  try {
    while (true) {
      switch (step) {
        case 0:
          step = 1;
          ans = g();
          break;
        case 1:
          a = ans;
          step = 2;
          ans = h();
          break;
        case 2:
          b = ans;
          step = 3;
          ans = i();
          break;
        case 3:
          c = ans;
          step = 4;
          ans = j();
          break;
        case 4:
          d = ans;
          step = 5;
          ans = a + b + c + d;
          break;
        case 5:
          return ans;
      }
    }
  } catch (e) {
    // Some stack saving logic...
  }
}

function if_guard_f() {
  let a, b, c, d;
  if (tst()) {
      a = g();
  }
  if (tst()) {
      b = h();
  }
  if (tst()) {
      c = i();
  }
  if (tst()) {
      d = j();
  }
  return a + b + c + d;
}

function if_guard_try_f() {
  let test = tst();
  let a, b, c, d;
  if (test) {
    try {
      a = g();
    } catch (e) {
      // Some stack saving logic...
    }
  }
  if (test) {
    try {
      b = h();
    } catch (e) {
      // Some stack saving logic...
    }
  }
  if (test) {
    try {
      c = i();
    } catch (e) {
      // Some stack saving logic...
    }
  }
  if (test) {
    try {
      d = j();
    } catch (e) {
      // Some stack saving logic...
    }
  }
  return a + b + c + d;
}

function g() {
  return --a;
}

function h() {
  return ++b;
}

function i() {
  return a % 3;
}

function j() {
  return b % 3;
}

function tst() {
  return true;
}

function runner(name, f, ...args) {
  const begin = Date.now();
  for (let i = 0; i < n; i++) {
    f(...args);
  }
  a = n;
  b = 0;
  const after = (Date.now() - begin) / 1000;
  console.log(`${name} runtime:\t${after} s`);
}

runner(plain_f, 'Original');
runner(fsm_f, 'Pyret-Style FSM');
runner(if_guard_f, 'If-Guarded Statements');
runner(fsm_try_f, 'Pyret-Style FSM w/ Try-Catch');
runner(if_guard_try_f, 'If-Guarded Statements w/ Try-Catch');
