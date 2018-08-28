const assert = require('assert');

function f() {
  function g() {}
  {
    captureCC(function(k) { k(); });
    g.x = 200;
  }
  captureCC(function(k) { k(); });
  assert(g.x === 200);
}

f();
