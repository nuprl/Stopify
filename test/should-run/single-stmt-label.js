const assert = require('assert');

function foo() {
  return 7;
}

let x = 1;

lbl: x = foo();

assert.equal(x, 7);
