const assert = require('assert');

const tst = 'foo';

let x = 0;

switch (tst) {
  case 'bar':
    assert(false);
    break;
  case 'foo': {
    let i = 0;
    while (i++ < 10) {
      if (++x >= 7) {
        break;
      }
    }
    assert.equal(x, 7);
    x = 10;
    break;
  }
  default:
    assert(false);
}

assert.equal(x, 10);
