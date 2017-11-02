const assert = require('assert');

function foo() {
  try {
    throw 42;
  } finally {
    bar();
  }
}

function bar() {
  while (false) {}
  return 8;
}

let x = 0;
try {
  foo();
} catch (e) {
  x = e;
}

assert.equal(e, 8);
