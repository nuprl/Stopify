const assert = require('assert');

function foo() {
  let counter = 0;

  function bar() {
    return ++counter;
  }

  return {
    a: counter,
    b: bar(),
    c: bar(),
  };
}

const o = foo();
assert.equal(o.a, 0);
assert.equal(o.b, 1);
assert.equal(o.c, 2);
