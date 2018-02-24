const assert = require('assert');

function suspend() {
  while (false) {}
}

function foo(x, y) {
  function bar() {
    y = 3;
  }
  suspend();
  y = 10;
  if (arguments.length < 2) {
    suspend();
    return x * y;
  } else if (arguments.length > 2) {
    suspend();
    return arguments[2] + arguments[3];
  }

  return x + y;
}

assert.equal(foo(3), 30);
assert.equal(foo(1, 2, 10, 4), 14);
assert.equal(foo(1, 2), 11);
