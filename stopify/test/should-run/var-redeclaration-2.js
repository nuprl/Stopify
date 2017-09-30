const assert = require('assert');
function f(x) {
  var x;
  function dummy() { return x; }
  x = 100;
  return x;
}

assert(f(0) === 100);