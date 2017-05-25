const assert = require('assert');

let x = 1;

function a() { x += 1; return 1}

a() + 1

assert.equal(x, 2)
