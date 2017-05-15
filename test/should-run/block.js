const assert = require('assert');
let x = 0;
{
    x++;
}
assert.equal(1, x);
