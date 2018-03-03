'use strict'

const obj = {
  a: 1
}

if (obj.a !== 1) {
  throw 'failure 1';
}
delete obj.a;
if (typeof obj.a !== 'undefined') {
  throw 'failure 2';
}
