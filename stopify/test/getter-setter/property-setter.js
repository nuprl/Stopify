const assert = require('assert');

var obj = {
  set current(name) {
    while(false) {}
    this.changed++
  },
  changed: 0
}

obj.current = 'EN';
assert.equal(obj.changed, 1)
obj.current = 'FA';
assert.equal(obj.changed, 2)
