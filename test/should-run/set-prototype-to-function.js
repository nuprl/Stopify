const assert = require('assert');

let s = 0;
function Animal() {
  this.kingdom = 'animalia'
}

Animal.sound = function() {
  return ++s;
}

function Cat() {
  this.type = 'cat'
  return 2;
}

Cat.prototype = Animal

const cat = new Cat()

assert.equal(cat.sound(), 1)
assert.equal(Cat.call({}), 2)
