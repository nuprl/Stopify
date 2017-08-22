const assert = require('assert');

var i = 0;

function f() {
  assert(i === 0);
  i = 1;
}

function g() {
  assert(i === 1);
  i = 2;
}

function h() {
  return f(), g(), i;
}

assert(h() === 2);