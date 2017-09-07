const assert = require('assert');

function foo() {
  return {
    bar() {
      let i = 0;
      let a = 7;
      while (i++ < 10) {}
      return a;
    }
  };
}

assert.equal(foo().bar(), 7);
