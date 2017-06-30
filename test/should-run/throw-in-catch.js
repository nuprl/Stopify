const assert = require('assert');
let a = 0;
try {
  try {
    foo + 1;
  } catch (e) {
    a = a + b;
  }
} catch (e) {
  a = 2;
}
assert.equal(a, 2);
