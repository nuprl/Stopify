const assert = require('assert');

const x = new Function('$a', 'return $a + 1')(10)

assert.equal(x, 11)
