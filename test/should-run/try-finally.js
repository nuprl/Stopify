const assert = require('assert');
let x = 7;
try {
  try {
    x--;
  } finally {
    throw x;
  }
} catch (e) {
  assert.equal(x--, 6);
} finally {
  assert.equal(x--, 5);
}
assert.equal(x, 4);
