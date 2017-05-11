const assert = require("assert")
var count = 0;
function f() {
  count++;
  return false;
}
var tmp = f() && true;

assert.equal(count, 1)
