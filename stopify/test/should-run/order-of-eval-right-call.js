const assert = require('assert');

let x = 1;

function b() { x *= 10; return 2}

1 + b()

assert.equal(x, 10)
