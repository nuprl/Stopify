const assert = require("assert");
let x = 0;

if (x > 0) {
  throw 'if branch executed';
}
else {
  x = 10;
}

assert(x, 10);
