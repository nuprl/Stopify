function f(a, b) {
  return a(0) + b(1);
}

// transform 1

function f(a, b) {
  const _l = a(0);
  const _r = b(1);
  const _a = _l + _r;
  return _a;
}

// transform 2
