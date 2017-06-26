const assert = require('assert');
let c = 0;
let n = 0;
function Cat() {
  c++;
}

Cat.prototype.noise = function () {
  n++;
}

new Cat().noise()

assert.equal(c, 1)
assert.equal(n, 1)
