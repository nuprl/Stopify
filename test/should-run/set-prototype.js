const assert = require('assert')

function foo () {}
foo.prototype = {p: 'a'}
const inst = new foo()

assert.equal(inst.p, 'a')
