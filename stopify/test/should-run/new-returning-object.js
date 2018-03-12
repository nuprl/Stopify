const assert = require('assert');

function bar() {
  while (false) {};
}

function Foo() {
  while(false) {};
  var a = {b: 1}
  bar();
  return a
}

assert.equal((new Foo()).b, 1)
