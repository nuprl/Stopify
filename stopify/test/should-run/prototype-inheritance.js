const assert = require('assert');

var $TypeData = function () {
  this.a = 1
};

$TypeData.prototype.func = function(zero, arrayEncodedName, displayName) {
  return 1;
};

const obj = new $TypeData()
assert.equal(obj.func(), 1)
