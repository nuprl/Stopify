const assert = require('assert');
function foo() {
  let i = 0;
  while (true) {
    if (++i > 9) {
      return i;
    }
  }
}
assert.equal(foo(), 10);
