const obj = {
  c: 1,
  get count() {
    while(false) {}
    return this.c++;
  }
}

if (obj.count !== 1) {
  throw 'error 1';
}

if (obj.count !== 2) {
  throw 'error 2';
}
