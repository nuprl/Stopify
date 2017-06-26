const assert = require('assert')

let x = 0;
let y = 0;
function foo() {
  x++;
  return {
    bar() {
      y++;
    }
  }
}

true ? foo().bar() : false;

assert.equal(x,1)
assert.equal(y,1)
