const assert = require('assert');

function f() {
  function g() { };
  g.x = 200;
  captureCC(function(k) { return k(); });
  assert(g.x === 200);
}

f();
  
