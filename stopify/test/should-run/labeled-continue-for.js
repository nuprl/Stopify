const assert = require('assert');

let i = 0;
l: for(let j = 0; j < 10; j++) {
  if (j % 2 === 0) {
    i++;
    do {
      continue l;
    } while (0);
    i++;
  }
}

assert.equal(i, 5);
