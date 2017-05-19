const assert = require('assert');

function inc(x) { return x + 1; }

const a = (function (x, y) { return inc(x) + inc(y) })(1, 2)

assert.equal(a, 5)
