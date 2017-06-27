'use strict';
function fapply(f, ...args) {
  return f(...args);
}

function sum(x, acc) {
    if (x === 0) {
        return acc;
    } else {
        return fapply(sum, x-1, acc + x);
    }
}

debug(sum(100000, 0));
