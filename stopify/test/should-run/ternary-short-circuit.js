const assert = require('assert');

function foo() {
  throw 'This should not be called'
}

assert.equal(1, true ? 1 : foo())
