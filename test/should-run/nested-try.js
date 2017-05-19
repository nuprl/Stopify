const assert = require('assert');
function baz() {
  try {
    throw 'foo';
  } catch (e) {
    assert.equal(e, 'foo');
    return 7;
  }
}

function bar() {
  try {
    const r = baz();
    assert.equal(r, 7);
    throw 9;
  } catch (e) {
    assert.equal(e, 9);
    throw false;
  }
}

function foo() {
  try {
    return bar();
  } catch (e) {
    assert.equal(e, false);
    return 11;
  }
}

assert.equal(foo(), 11);
