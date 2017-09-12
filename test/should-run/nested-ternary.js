const assert = require('assert');

function Foo() {}
function Bar() {}

function foo() {
  return this.left instanceof Foo ? new Baz(this.left.error) :
    this.right instanceof Bar ?  new Baz(this.right.error) : 7;
}

assert.equal(foo(), 7);
