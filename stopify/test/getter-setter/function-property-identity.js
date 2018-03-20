const assert = require('assert');

Object.defineProperty({}, 'a', {});

function F(x) {
  return x;
}

const a = {
  f: F,
}

assert.equal(a.f, F);
