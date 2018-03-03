const obj = {
  ix: -1,
  parent: false
}

let curr = obj

for (var i = 0; i < 10; i++) {
  curr.child = {
    ix: i,
    parent: curr
  }
  curr = curr.child;
}
if (curr.ix !== 9) {
  throw 'error';
}

