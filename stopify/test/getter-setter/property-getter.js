const assert = require('assert');

const obj = {
  c: 1,
  get count() {
    while(false) {}
    return this.c++;
  }
}

assert.equal(obj.count, 1)
assert.equal(obj.count, 1)
