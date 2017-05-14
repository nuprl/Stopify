const assert = require("assert");
function f(a, b) {
	let x = a(b(6));
	let r = a(x) + b(a(x));
	return r;
}

assert.equal(f(x => x + 1, y => y * 10), 682);
