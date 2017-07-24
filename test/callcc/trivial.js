const assert = require('assert');


function f() {
  return callCC(function(k) {
    k(100);
    return 5;
  });
}

assert(f() === 100);

