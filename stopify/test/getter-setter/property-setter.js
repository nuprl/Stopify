var obj = {
  set current(name) {
    while(false) {}
    this.changed++
  },
  changed: 0
}

obj.current = 'EN';
if (obj.changed !== 1) {
  throw 'error 1';
}
obj.current = 'FA';
if (obj.changed !== 2) {
  throw 'error 2';
}
