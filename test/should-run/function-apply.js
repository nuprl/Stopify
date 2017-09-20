const assert = require('assert');

function inc(x) { return x + 1; }

function add(x, y) {
  return inc(x + y);
}

assert.equal(add.apply({}, [1, 2]), 4)
