const assert = require('assert');

Object.defineProperty({}, 'a', {});

function F(x) {
  return F.f.call(this, x);
}

const a = {};
a.f = F;
const o = a.f;

o.f = function (x) {
  return x;
};
assert.equal(F(9), 9);
