const assert = require('assert');

function myfunc() {
  return 10;
}

myfunc = function() { for (var i = 0; i < 2; i++) { }; return 20; };

assert(myfunc() === 20);
console.log("Should print");