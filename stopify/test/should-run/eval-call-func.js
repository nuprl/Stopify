"use strict"

const assert = require('assert');

let x = 0;

function foo() {
  x++;
}

eval('foo()')

assert.equal(x, 1)
