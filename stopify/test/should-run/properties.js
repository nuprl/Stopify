const assert = require('assert');
function Obj(n) {
  this.prop = n;
}

Obj.prototype.getN = function () {
  return this.prop;
};

const o = new Obj(7);
assert.equal(o.getN(), 7);
