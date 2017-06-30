const assert = require('assert');
let a = 0;
try {
  foo + 0;
} catch (e) {
  a = 7;
}
assert.equal(a, 7);
