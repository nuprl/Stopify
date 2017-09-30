const assert = require('assert');

let x = 0;
let y = 0;
function foo() {
  return x++ < 10;
}

while (foo()) {
  if (y++ > 10) {
    assert(false);
  }
}

assert.equal(x, 11);
