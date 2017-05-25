const assert = require('assert');
const obj = {
  a: 0,
  b: 1,
  c: 2,
};
let i = 0;
for (const prop in obj) {
  assert.equal(obj[prop], i++);
}
