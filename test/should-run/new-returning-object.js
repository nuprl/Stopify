const assert = require('assert');

function Foo() {
  var a = {b: 1}
  return a
}

assert.equal((new Foo()).b, 1)
