const assert = require("assert")
function foo() {
  this.a = "prop";
}

var f = new foo();

assert(f.a === "prop")
