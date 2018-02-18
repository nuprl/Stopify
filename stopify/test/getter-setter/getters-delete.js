'use strict'

const assert = require('assert');

const obj = {
  a: 1
}

assert.equal(obj.a, 1)
delete obj.a
assert.equal(typeof obj.a, 'undefined')
