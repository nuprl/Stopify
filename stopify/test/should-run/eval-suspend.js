const assert = require('assert');

let x = 0;

function foo() {
  while (false) {}
  x = 1;
}

eval(`while (++x < 10) {}`);

assert.equal(x, 10);

