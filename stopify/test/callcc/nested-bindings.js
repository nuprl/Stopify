const assert = require('assert');

function f() {
  function g() {}
  {
    callCC(function(k) { });
    g.x = 200;
  }
  callCC(function(k) { });
  assert(g.x === 200);
}

f();
