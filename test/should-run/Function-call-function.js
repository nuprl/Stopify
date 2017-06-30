const assert = require('assert');

global.g = function (x) {
  return x * 10;
}

const f = new Function('x', "return g(x)")

assert(f(10), 100)
