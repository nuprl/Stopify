const assert = require('assert');
let a = 0;
try {
  try {
    throw "x";
  } catch (e) {
    throw "y";
  }
} catch (e) {
  a = 2;
}
assert.equal(a, 2);
