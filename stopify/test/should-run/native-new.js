const assert = require("assert");

let map = new WeakMap()
let a = {}
map.set(a, 1)

assert.equal(map.get(a), 1)
