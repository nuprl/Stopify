const assert = require('assert');

function sleep(n) {
  return captureCC(function (k) {
    return $__R.endTurn(function (onDone) {
      return setTimeout(function () {
        $__R.runtime(k, onDone);
      }, n);
    });
  });
}

let i = 0;

function h() {
  console.log('foo');
  return 1;
}

function f() {
  while (false) {}
}

async function g() {
  while (false) {}
  await Promise.resolve((f(), 1));
  console.log('sleeping within g');
  sleep(1000);
  return Promise.resolve(i);
}

$__R.promise((async function () {
  let v = await Promise.resolve(42)
  assert.equal(v, 42);
  console.log('starting');
  sleep(1000);
  console.log('sleep 1');
  sleep(1000);
  console.log('done waiting...');
  f();
  assert.equal(i, 0);
  i = v;
  v = await g();

  console.log('sleeping after g');
  sleep(1000);

  assert.equal(i, v);
  console.log('done');
})());

assert.equal(i, 0);
console.log('end');
