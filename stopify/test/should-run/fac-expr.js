const assert = require('assert');

const x = (function fac(n) {
  if (n === 0) return 1;
  else return n*fac(n-1)
})(5)

assert.equal(x, 120)
