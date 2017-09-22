const assert = require('assert');

function foo() {
  while (false) {}
  return { a: 7 };
}

const o = new foo();
assert.equal(o.a, 7);
