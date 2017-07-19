const assert = require('assert');

function h() {}

function f() {
  function g() {}
  {
    h();
    g.x = 200;
  }
  h();
  assert(g.x === 200);
}

f();
