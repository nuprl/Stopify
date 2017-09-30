const assert = require("assert");
function inc(x) { return x + 1; }
let sum = 0;

for (let i = 0; i < 10; i++) sum = inc(sum);

assert.equal(sum, 10);
