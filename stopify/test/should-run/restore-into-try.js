const assert = require('assert');
function MYFUNC0() {
  while(false) {};
  return 42;
}
function MYFUNC(x) {
  var r;
  if (x) {
    try {
      r = MYFUNC0();
    }
    catch(exn) {
    }
  }
  return r;
}

assert(MYFUNC(true) === 42);
