/**
 * This tests restarting a captured continuation by throwing a value.
 */
var assert = require('assert');

function restartWithExn() {
  try {
    f();
  }
  catch(e) {
    return e;
  }
}

function f() {
  return captureCC(function(k) {
    return g(k);
  });
}

// `k` is a function returned by `makeCont` in the Runtime class.
// k : (v: any, err?: any) => any
function g(k) {
  return k(null, "throw-this");
}

var result = restartWithExn();

console.log("Result of restart:", result);

assert(result == "throw-this");

