const assert = require('assert');

function MYOTHER() { while(false) {} }

var x = true;

function MYFUNCTION() {
  try {
    if(x) {
      return 10;
    }
  }
  finally {
    MYOTHER();
  }
}
assert(MYFUNCTION() === 10);