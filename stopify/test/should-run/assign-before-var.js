const assert = require('assert');

var XXX = 999;
function MYOUTERFUNC() {
  INNER_FUNCTION(undefined);
  XXX = 5;
  function INNER_FUNCTION(expected) {
    assert(XXX === expected);
  }

  INNER_FUNCTION(5);
  var XXX = 20;
  
  INNER_FUNCTION(20);
}

MYOUTERFUNC();
assert(XXX === 999);
