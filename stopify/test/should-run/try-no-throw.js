const assert = require('assert');
let x = 6;
try {
  x++;
} catch (e) {
  assert.equal(true, false);
}
assert.equal(x, 7);
