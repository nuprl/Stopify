const assert = require('assert');

function f() {

  function g() { return h() };
  function h() { return 0; };
  callCC(function(k) { });
  h = function() { return 100; }
  return g();
}

assert(f() === 100);
