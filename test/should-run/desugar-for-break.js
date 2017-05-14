const assert = require("assert");
let sum = 0;
for(let i = 0; i < 5; i++) {
  sum += i;
  if (i === 3) break;
}

assert(sum === 6);
