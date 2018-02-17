const assert = require('assert');

function unit() {
  while (false) {}
  return 1;
}

const two = eval('unit() + unit()');

assert.equal(2, two);
