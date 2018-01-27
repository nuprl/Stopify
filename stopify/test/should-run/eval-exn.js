const assert = require('assert');

let x = 0;

function foo() {
  while (false) {}
  x = 1;
}

function bar() {
  while (false) {}
  x = 2;
  throw x;
}

try {
  eval('foo(); bar();');
} catch (e) {
  assert.equal(e, 2);
  x = 7;
}

assert.equal(x, 7);
