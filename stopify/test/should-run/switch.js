const assert = require('assert');
const t = 'test';
switch (t) {
  case 'foo':
    assert(false);
    break;
  case 'test':
    assert(true);
    break;
  case 'bar':
    assert(false);
}
