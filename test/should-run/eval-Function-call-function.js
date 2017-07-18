const assert = require('assert');

global.g = function (x) {
  return x * 10;
}

global.h = function (x) {
  return x + 10;
}

const f = new Function('x', "const _t = g(x); const _t2 = h(x); return _t + _t2")

assert.equal(f(10), 120)
