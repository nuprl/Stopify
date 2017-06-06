const assert = require('assert');
const obj = {
  foo: function () {
    return 7;
  }
};

const f = (obj.bar || obj.foo);
assert.equal(f, obj.foo);
