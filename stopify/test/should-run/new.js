const assert = require("assert");
function foo() {
  while(false) {};
  this.a = "prop";
}

var f = new foo();

assert(f.a === "prop");
