const assert = require('assert');
let test = 'test';

switch (test) {
  case 'baz':
    test = 'baz';
  case 'test':
  case 'foo':
  case 'bar':
    assert.equal(test, 'test');
    break;
  default:
    assert(false);
}
