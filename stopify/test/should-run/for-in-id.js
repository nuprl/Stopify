const assert = require('assert');
const o = {
  a: 1,
  b: 2,
  c: 3,
};
let k;
let i = 0;
for (k in o) {
  assert.equal(++i, o[k]);
}
