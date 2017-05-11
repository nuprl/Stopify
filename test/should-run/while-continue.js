const assert = require("assert")
function foo() {
    let sum = 0;
    let i = 0;
    while (i <= 10) {
        i++;
        if (i % 2 === 1)
            continue;
        else
            sum += i;
    }
    return sum;
}
assert.equal(30, foo());
