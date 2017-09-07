const assert = require('assert');

function foo() {
  return {
    bar() {
      let a = 7;
      return 2*a;
    }
  };
}

assert.equal(foo().bar(), 14);
