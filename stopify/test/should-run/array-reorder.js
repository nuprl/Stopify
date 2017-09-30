const assert = require('assert');

function foo() {
  let counter = 0;

  function bar() {
    return ++counter;
  }

  return [
    counter,
    bar(),
    bar(),
  ];
}

const arr = foo();
assert.equal(arr[0], 0);
assert.equal(arr[1], 1);
assert.equal(arr[2], 2);
