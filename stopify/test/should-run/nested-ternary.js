const assert = require('assert');

function Foo() {}
function Bar() {}
function Baz() {}

function foo() {
  const o = {};
  return (o.left instanceof Foo) ? new Baz(o.left.error) :
    ((o.right instanceof Bar) ?  new Baz(o.right.error) : 7);
}

assert.equal(foo(), 7);
