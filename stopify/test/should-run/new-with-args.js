const assert = require('assert');

function foo() {
  while (false) {}
}

function Point(x, y, z) {
  foo();
  this.x = x;
  foo();
  this.y = y;
  foo();
  this.z = z;
}

const point = new Point(1, 2, 3);

assert.equal(point.x, 1);
assert.equal(point.y, 2);
assert.equal(point.z, 3);
