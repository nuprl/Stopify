const assert = require('assert');

var o = {a: 0};

Object.defineProperty(o, 'count', {
  get: function() { return this.a++; }
});

assert.equal(o.count, 0)
assert.equal(o.count, 1)
