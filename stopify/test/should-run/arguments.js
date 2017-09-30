function g() {

}


function f() {
  g();
  return arguments[0];
}

const assert = require('assert');
assert(f(100) === 100);