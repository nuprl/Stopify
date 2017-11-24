const assert = require('assert');

var BAR = function BAR2() {
  while(false);
}

var x = function FOO() {
  var FOO = 100;
  BAR();
  return FOO;
}

assert(x() === 100);