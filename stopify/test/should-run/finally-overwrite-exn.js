const assert = require('assert');

function foo() {
  try {
    if (true) {
      throw 42;
    }
  } finally {
    bar();
  }
}

function bar() {
  while (false) {}
  throw 8;
}

let x = 0;
try {
  foo();
} catch (e) {
  x = e;
}

assert.equal(x, 8);
