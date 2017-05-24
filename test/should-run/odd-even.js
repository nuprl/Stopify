const assert = require('assert');

function odd(n) {
  if(n === 0) return false;
  else return even(n-1)
}

function even(n) {
  if(n === 0) return true;
  else return odd(n-1)
}

assert.equal(odd(50), false)
