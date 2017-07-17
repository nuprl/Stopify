const assert = require('assert');

let i = 0;
let j = 6;
function f() {
  return (i++ % 2) === 0;
}

while (f() && j++) {
}

assert.equal(i, 2);
assert.equal(j, 7);
