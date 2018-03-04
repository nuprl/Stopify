'use strict';

function triangle(n) {
  if (n <= 0) {
    return 1;
  } else return n + triangle(n - 1);
}

for (var i = 0; i < 50 * 500; i++) {
  triangle(500);
}
