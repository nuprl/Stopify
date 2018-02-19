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

function g(k) {
  return k(null, "throw-this");
}

var result = restartWithExn();

console.log("Result of restart:", result);

assert(result == "throw-this");

