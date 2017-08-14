function g() { 
  return 1;
}
function f(x) {
  var y = x;
  var dummy = g(),  
     z = y;
  return z;
};

const assert = require('assert');
assert(f(100) === 100);