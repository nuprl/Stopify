const assert = require('assert');

const x = Math.imul.call({}, 2, 3)

assert.equal(x, 6)
