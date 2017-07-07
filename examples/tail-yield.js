$interval = 100
const $onDone = () => console.log('Done');
const $isStop = () => false
function $run(gen, k, res = { done: false }) {
  setTimeout(_ => {
    if(res.done) {
      return k(res.value)
    }
    else if ($isStop()) {
      console.log('Stop')
    }
    else {
      const res = gen.next();
      if (res.value && res.value.__isgen) {
        return $run(res.value.__gen, (v) => $run(gen, k, gen.next(v)), res)
      } else {
        return $run(gen, k, res)
      }
    }
  })
}

function *$runProg() {

  function *odd(n) {
    console.log(`odd: ${n}`)
    if(n === 0) return false;
    else return yield { __isgen: true, __gen: even(n-1) }
  }

  function *even(n) {
    console.log(`even: ${n}`)
    if(n === 0) return true;
    else return yield { __isgen: true, __gen: odd(n-1) }
  }

  console.log(yield* odd(100))
}

$run($runProg(), $onDone)
