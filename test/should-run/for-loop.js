const assert = require("assert");
let sum = 0;
for(let i = 0; i < 5; i++) {
  sum += i;
    console.log('in loop');
}

assert.equal(sum, 10);
