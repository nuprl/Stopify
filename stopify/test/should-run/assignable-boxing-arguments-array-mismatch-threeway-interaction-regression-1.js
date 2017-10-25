const assert = require('assert');
function G() {  while(false) {} };

function F(x) {
  G();
  const z = arguments;
  function H() {
    x = 10;
  }
  return x;
}

assert(F(42) === 42);
