const assert = require("assert");
try {
  throw 5;
  assert.equal(true, false);
} catch (e) {
  assert.equal(5, e);
}
