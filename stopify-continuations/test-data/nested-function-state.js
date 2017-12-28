const assert = require('assert');

function f() {

  function g() { return h() };
  function h() { throw 'original h called'; };
  captureCC(function(k) { k(42); });
  h = function() { return 100; }
  return g();
}

assert(f() === 100);
