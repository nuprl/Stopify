const assert = require("assert");
try {
  throw 5;
  assert(false);
} catch (e) {
  assert.equal(5, e);
}
