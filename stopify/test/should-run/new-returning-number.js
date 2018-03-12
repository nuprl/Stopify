const assert = require('assert');

function F() { while(false) { } }

function C() {
  this.x = 42;
  F();
  return 5;
}

var o = new C();
assert.equal(o.x, 42);
