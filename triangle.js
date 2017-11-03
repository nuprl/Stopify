'use strict';

function triangle(n) {
  if (n === 0) {
    return 1;
  }
  else {
    return n + triangle(n - 1);
  }
}

var r = 0;
for (var i = 0; i < 150000; i++) {
  r = (i % 2) + triangle(1000);
}
