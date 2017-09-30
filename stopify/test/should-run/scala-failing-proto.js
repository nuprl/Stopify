function C() {}

function A() {}

A.prototype = new C()
A.prototype.constructor = A
