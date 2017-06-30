const assert = require('assert');

const f = new Function('x', 'return x + 1')

assert.equal(f(0), 1)
