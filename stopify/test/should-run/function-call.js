const assert = require('assert');

function inc(x) { return x + 1; }

function add(x, y) {
  return inc(x) + inc(y);
}

assert.equal(add.call({}, 1, 2), 5)
