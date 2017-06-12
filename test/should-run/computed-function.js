const assert = require('assert');
function Obj() {
  this.foo = function (x) { return x + 1; };
}

const o = new Obj();
assert.equal(o['foo'](7), 8);
