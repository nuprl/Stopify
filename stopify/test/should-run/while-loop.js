const assert = require("assert");
function inc(x) { return x + 1; }

let sum = 0;
let iter = 0;

while (iter++ < 10) {
  sum = inc(sum);
}

assert.equal(sum, 10);
