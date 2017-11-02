const assert = require('assert');

let x = 0;
function foo() {
  try {
    if (true) {
      throw 42;
    }
  } finally {
    x = bar();
  }
}

function bar() {
  while (false) {}
  return 8;
}

try {
  foo();
} catch (e) {
  x = e;
}

assert.equal(x, 42);
