const assert = require('assert');
var i = 0;

var o1 = { toString: function() { i = i + 1;  return 'Hello '; } };
var o2 = { toString: function() { i = i + 10; return 'world'; } };
assert(o1 + o2 === 'Hello world');
assert(i === 11);