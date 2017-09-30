const assert = require('assert');

function MYOUTERFUNC() {

  function INNER_FUNCTION() {
    assert(XXX);
  }

  var XXX = true;
  
  INNER_FUNCTION();
}

MYOUTERFUNC();
