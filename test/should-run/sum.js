const assert = require('assert');
function sum(n) {
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    sum += i;
  }
  return sum;
}

assert.equal(sum(100), 5050);
