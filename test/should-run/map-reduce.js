const assert = require('assert');

const arr = [1,2,3,4,5]

const r = arr.map(x => x + 1).reduce((x, y) => x + y, 0)

assert.equal(r, 20)
