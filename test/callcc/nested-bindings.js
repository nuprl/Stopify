const assert = require('assert');

function f() {
  function g() {}
  {
    $__R.callCC(function(k) { });
    g.x = 200;
  }
  $__R.callCC(function(k) { });
  assert(g.x === 200);
}

f();
