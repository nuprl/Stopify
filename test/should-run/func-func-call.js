const assert = require('assert');

let m = 0;
let a = 0;
function makeAdd(n) {
  m++;
  return function (x) {
    a++;
    return n + x;
  }
}

const a = makeAdd(10)(1)

assert.equal(a, 11)
assert.equal(m, 1)
assert.equal(a, 1)
