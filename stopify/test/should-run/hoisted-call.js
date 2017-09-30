const assert = require('assert')
let x = 0;
(function foo() {
  bar();
  function bar() {
    x = 1
  }
})()

assert.equal(x, 1)
