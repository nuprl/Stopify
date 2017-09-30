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

const r = makeAdd(10)(1)

assert.equal(r, 11)
assert.equal(m, 1)
assert.equal(a, 1)
