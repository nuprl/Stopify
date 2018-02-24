const assert = require('assert');

const suspend = function () { while (false) {} }

const F = function (x) {
  'use strict';
  arguments[1] = x;
  x = 10;
  suspend();
  assert.equal(arguments[0], 200);
  assert.equal(arguments[1], 200);
  return x;
}
//
//const G = function (x) {
//  arguments[1] = x;
//  x = 10;
//  suspend();
//  assert.equal(arguments[0], 10);
//  assert.equal(arguments[1], 200);
//  return x;
//}
//
assert.equal(F(200), 10);
//assert.equal(G(200), 10);
