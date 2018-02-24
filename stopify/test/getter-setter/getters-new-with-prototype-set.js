"use strict";

var sjcl = {
};
sjcl.sha256 = function(a) {
  //console.log(this.__proto__)
  console.log(this.a[0])
};
sjcl.sha256.prototype = {
  a: [1],
};

console.log(new sjcl.sha256)
