const assert = require('assert');

var i = 0;
var j = 8;

checkiandj: while (i < 4) {
  i += 1;

  checkj: while (j > 4) {
    j -= 1;

    if ((j % 2) === 0) {
      i = 5;
      continue checkiandj;
    }
  }
}

assert.equal(i, 5);
assert.equal(j, 6);
