const assert = require('assert');

function add(x, y) {
  return x + y;
}

assert.equal(add.call({}, 1, 2), 3)
