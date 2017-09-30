const assert = require('assert');

function n(c, a, b) {
  this.t = c;
  this.c = a;
  this.l = b;
}

function a(a) {
  return new n(0, a, a.length);
}

function ad(c, b) {
  aw(c, a(b));
}
var d = [0];

function A(a) {
  ad(d.Invalid_argument, a);
}

function am() {
  A(G);
}

function ab(a, b) {
  if (b >>> 0 >= a.length - 1) am();
  return a;
}

function o(a) {
  if (a < 0) A("String.create");
  return new n(a ? 2 : 9, b, a);
}

function aw(b, a) {
  throw [0, b, a];
}

function r(d, c) {
  var a = v(d),
    e = v(c),
    b = o(a + e | 0);
  q(d, 0, b, 0, a);
  q(c, 0, b, a, e);
  return b;
}

function x(a) {
  if (2 <= a) {
    var b = x(a - 2 | 0);
    return x(a - 1 | 0) + b | 0;
  }
  return 1;
}

var b = "";
var ai = a(" instead of "),
  aj = a(" returned "),
  ak = a("fib "),
  ah = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597,
    2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811,
    514229, 832040, 1346269, 2178309, 3524578, 5702887, 9227465, 14930352,
    24157817, 39088169, 63245986, 102334155, 165580141, 267914296, 433494437,
    701408733];

var D = ah.slice(),
  E = x(10),
  al = 10,
  F = E === ab(D, 10)[11] ? 0 : [0, r(ak, r(a("10"), r(aj, r(a(b + E), r(ai, a(b + ab(D, 10)[al + 1]))))))];

assert.equal(F, 0);
