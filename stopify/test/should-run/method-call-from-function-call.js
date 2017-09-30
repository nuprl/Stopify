const assert = require('assert')

let x = 0;

function foo() {
  x++;
  return {
    bar() { x++ }
  }
}

foo().bar();

assert.equal(x, 2)
