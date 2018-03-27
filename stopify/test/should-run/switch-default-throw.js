const assert = require('assert');
const t = 'test';

function bar() {
  while (false) {}
}

function foo() {
  while (false) {}
  switch (t) {
    case 'foo':
      assert(false);
      break;
    case 'test':
      assert(true);
      break;
    case 'bar':
      assert(false);
      break;
    default:
      throw false;
  }
  bar();
}

foo();
