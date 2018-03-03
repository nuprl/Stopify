var o = {a: 0};

Object.defineProperty(o, 'count', {
  get: function() { return this.a++; }
});

if (o.count !== 0) {
  throw 'error 1';
}
if (o.count !== 1) {
  throw 'error 2';
}
