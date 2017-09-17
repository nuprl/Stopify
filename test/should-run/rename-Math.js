const assert = require('assert');

assert(Math.imul(10, 20), 200)

function test() {
  function Math() {
    let sum = 0
    for (let i = 0; i < 1000; i++) {
      sum += 1
    }
    this.sum = sum
  }

  assert.equal((new Math()).sum, 1000)
}

test()
