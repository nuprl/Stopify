const assert = require('assert');

let x = 1;

function a() { x += 1; return 1}
function b() { x *= 10; return 2}

a() + b()

assert.equal(x, 20)
