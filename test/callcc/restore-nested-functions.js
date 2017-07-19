const assert = require('assert');

function f() {
  function g() { };
  g.x = 200;
  $__R.callCC(function(k) { });
  assert(g.x === 200);
}

f();
  
