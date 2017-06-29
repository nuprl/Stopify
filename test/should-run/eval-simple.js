"use strict"

const assert = require('assert');

let x = 0;

eval('x++')

assert.equal(x, 1)
