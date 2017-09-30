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

true || foo().bar();

assert.equal(x,0)
assert.equal(y,0)
