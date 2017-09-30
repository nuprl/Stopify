function g(x) {
  return x;
}

function h(f) { return f; }

function f() {
  return h(function VICTIM() {
    var r = g(1);
    return r + 1;
  });
}

const assert = require('assert');
assert(f()() === 2);


