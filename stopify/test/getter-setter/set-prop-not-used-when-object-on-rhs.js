const assert = require('assert');

const obj = {
  ix: -1,
  parent: false
}

let curr = obj

for (var i = 0; i < 10; i++) {
  curr.child = {
    ix: i,
    parent: curr
  }
  curr = curr.child;
}

assert.equal(curr.ix, 9)
