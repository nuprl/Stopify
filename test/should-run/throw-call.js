const assert = require('assert');

let x = 0;

function foo() {
  try {
    x++;
    throw bar();
  } catch (e) {
    return e;
  }
}

function bar() {
  return ++x;
}

assert.equal(foo(), 2);
