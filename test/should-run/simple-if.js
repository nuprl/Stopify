const assert = require("assert");
let x = 0;

if (x === 0) {
  x = 10;
}
else {
  x = 20;
}

assert.equal(x, 10);
