const assert = require('assert');

const f = false;
let x = 0;

f && (x++ === 7);
f || (x++ === 7);

assert.equal(x, 1);
