"use strict"

const assert = require('assert');

let x = 0

function foo() {
  x++;
}

eval('function g() { foo() }; g()')

assert.equal(x, 1)
