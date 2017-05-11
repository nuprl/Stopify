const assert = require("assert")
let x = 0;

if (x > 2) {
  throw 'this shouldnt be executed';
}
else {
  if (x < 1) {
    x = 10;
  }
  else {
    throw 'this shouldnt be executed';
  }
}

assert.equal(x, 10)
