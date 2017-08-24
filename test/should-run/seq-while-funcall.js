const assert = require('assert');

var x = 0;
var r;
function AFUNCTION() {
  x++;
  r =  x < 2;
}

while(AFUNCTION(), r) { } 

assert(x === 2);