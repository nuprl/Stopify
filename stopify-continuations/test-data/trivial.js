const assert = require('assert');


function f() {
  return captureCC(function(k) {
    k(100);
    assert(false);
    return 5;
  });
}

assert(f() === 100);

