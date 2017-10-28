const assert = require('assert');

function sum(x) {
    if (x <= 1) {
        return 1;
    } else {
        return x + sum(x-1);
    }
}

assert.equal(sum(500000), 125000250000)
