const assert = require('assert');
let x = 0;
let y = 0;
let z = 0;

function foo() {
  x++;
  return {
    bar() {
      y++;
      return {
        baz() {
          z++;
          return 1;
        }
      }
    }
  }
}

const a = foo().bar().baz();

assert(a === 1 && x == 1 && y == 1 && z == 1)
