const assert = require('assert');

let x = 7;
let y = 'hello';

function foo() {
  let z = 0;
//  arguments[1] = x;
  eval('function bar() { while (false) {} } bar(); x = 10; y = x');
  {
    let z = 1;
    eval('z = 9')
    assert.equal(z, 9);
  }
//  assert.equal(arguments[1], 7);
  assert.equal(z, 0);
}
foo();

assert.equal(x, 10);
assert.equal(y, 10);
