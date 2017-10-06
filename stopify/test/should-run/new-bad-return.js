const assert = require('assert');

function F() { while(false) { } }

function C() {
  F();
  this.x = 42;
  return 5;
}

var o = new C();
assert.equal(o.x, 42);
