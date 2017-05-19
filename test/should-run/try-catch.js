const assert = require("assert");
function foo() {
    try {
        throw 5;
    } catch (e) {
        return e;
    }
}
assert.equal(5, foo());
