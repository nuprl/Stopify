const assert = require('assert');
function foo(x) {
  return x;
}

const obj = {
  a: foo(0),
  b: foo(false),
//  [foo('prop')]: 8,
};

assert.equal(obj.a, 0);
assert.equal(obj.b, false);
//assert.equal(obj.prop, 8);
