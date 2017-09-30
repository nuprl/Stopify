const assert = require('assert');

var i = 0;
var j = 0;
var loop = true;

while(i = i + 1, loop) {
  j = j + 1;
  loop = j < 2;
}

assert(i === 3);
