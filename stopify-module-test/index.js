const assert = require('assert');

const stopify = require('stopify/dist/src/stopify/compileFunction')

const prog = `
function foo() {
  let count = 0;
  while(count < 10) {
    count++;
  };

  return count;
}`

// 1. Compile the function
const transformed = stopify.compileFunction(prog)
console.log('1. Program succesfully compiles')

// 2. Make sure transformed is a valid function.
const func = eval(`(function(f) {return f})(${transformed})`)
assert.equal(typeof func, 'function')
console.log('2. Result is a valid function')

// 3. stopify-continuations provides required variables.
const runFunc = `
const $__T = require("stopify-continuations/dist/src/runtime/runtime")
const $__R = $__T.newRTS('lazy')
const $S = require("stopify/dist/src/runtime/node").init($__R);

${transformed}

foo()
`
assert.equal(eval(runFunc), 10)
console.log('3. stopify-continuations provides runtime. Function can be run.')
