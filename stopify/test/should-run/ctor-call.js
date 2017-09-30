const assert = require('assert');
function f(x) {
  return x + 1;
}

function Obj(n) {
  this.prop = f(n);
}

const o = new Obj(7);
assert.equal(o.prop, 8);
