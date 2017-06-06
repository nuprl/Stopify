const assert = require('assert');
function foo() {
  for (let i = 0; i < 10; i++) {
    var isEven = i % 2 === 0 ? i : isEven;
  }
  return isEven;
}

assert.equal(8, foo());
