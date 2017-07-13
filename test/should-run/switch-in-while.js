const assert = require('assert');

const tst = 'foo';

let x = 0;
let i = 0;

while (i++ < 10) {
  switch (tst) {
    case 'bar':
      assert(false);
      break;
    case 'foo': {
      x++;
      break;
    }
    default:
      assert(false);
  }
  assert.equal(i, x);
}

assert.equal(x, 10);

