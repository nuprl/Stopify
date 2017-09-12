const assert = require('assert');

function f() {
  return 1;
}

function k(f) {
  // This f should not be marked flat.
  let app = f();
  return app
}

function g() {
  for(let i = 0; i < 100; i ++) {}
  return app1
}

assert.equal(k(g), 200)
