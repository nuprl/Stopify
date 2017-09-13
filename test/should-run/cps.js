const assert = require("assert");
function f(a, b) {
	let x = a(b(6));
	let r = a(x) + b(a(x));
	return r;
}

assert.equal(f(function(x) { return x + 1; },function( y) { return y * 10; }), 682);
