const assert = require("assert");

function F() { while(false) {} };

function G() { while(false) { } ; throw 'jump'; }

var r = 0;

try {
  G();
}
catch (exn) { 
  F();
  r = 1;
}

assert.equal(r, 1);
