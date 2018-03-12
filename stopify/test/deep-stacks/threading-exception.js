const assert = require('assert');

/**
 * This test makes sure that an exception thrown from a stack
 * frame is properly threaded through a captured stack.
 */

function sumThrow(n) {
  if (n <= 0) {
    throw 0;
  }
  else {
    try {
      sumThrow(n - 1);
    }
    catch(e) {
      throw e + n;
    }
  }
}

try {
  sumThrow(500000)
}
catch(e) {
  assert.equal(e, 125000250000)
}
