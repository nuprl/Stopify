const assert = require('assert');

function foo() {
  let counter = 0;

  function bar(c1, c2) {
    ++counter;
    return c1;
  }

  return bar(counter, bar(counter));
}

assert.equal(foo(), 0);
