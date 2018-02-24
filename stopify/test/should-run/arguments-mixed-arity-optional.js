const assert = require('assert');

function suspend() {
  while (false) {}
}

function foo(x, y) {
  suspend();
  if (arguments.length < 2) {
    y = 10;
    suspend();
  } else if (arguments.length > 2) {
    suspend();
    return arguments[2] + arguments[3];
  }

  return x + y;
}

assert.equal(foo(3), 13);
assert.equal(foo(1, 2, 10, 4), 14);
