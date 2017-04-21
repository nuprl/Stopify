function f(a) {
  if (a == 0) {
    return 1;
  }
  else {
    return 2;
  }
  throw 'dead-code executed'
}

assert.equal(f(0), 1)
