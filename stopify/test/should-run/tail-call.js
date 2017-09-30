const assert = require('assert');

function f(i) {
  if (i === 0) {
    return 7;
  } else {
    return f(i - 1);
  }
}

assert.equal(7, f(37));
