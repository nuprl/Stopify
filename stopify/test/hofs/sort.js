const assert = require('assert');

const arr = [1,2,3,5,4];

arr.sort(function (a,b) {
  while (false) {}
  return a - b;
});

for (let j = 0; j < 4; j++) {
  assert.equal(arr[j], j+1);
}
