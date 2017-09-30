const assert = require('assert');
var i = 0;

function MYOTHER() { while(false) {} }

function MYFUNCTION() {
  try {
    MYOTHER();
  }
  finally {
    i = i + 1;
  }
}
MYFUNCTION();

assert(i === 1, `expected 1 but got ${i}`);