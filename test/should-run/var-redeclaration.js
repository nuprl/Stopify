const assert = require('assert');
function f(x) {
  var x;
  function dummy() { return x; }
  return x;
}

assert(f(100) === 100);