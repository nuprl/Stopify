const assert = require('assert');
let x = 0;
foo: {
  bar: {
    baz: {
      break baz;
      x = 1;
    }
    break bar;
    x = 2;
  }
  break foo;
  x = 3;
}

assert.equal(x, 0);
