function sleep(n) {
  return captureCC(function (k) {
    return $__R.endTurn(function (onDone) {
      return setTimeout(function () {
        $__R.runtime(k, onDone);
      }, n);
    });
  });
}

const v = captureCC(function (k) {
  return k(42) + 1729;
});

console.log(v);
sleep(3000);
console.log(v);
