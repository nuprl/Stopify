/*
 * The runtime is wrapped in a funtion:
 * function($isStop, $onStop, $onDone, $interval).
 * The output of the yield transform expects $counter to be defined.
 */
const $yieldCounter = $interval;
let $counter = 0;
function $mark_func(f) {
  f.$isTransformed = true;
  f.call = f.call.bind(f);
  f.call.$isTransformed = true
  f.apply = f.apply.bind(f);
  f.apply.$isTransformed = true;
  return f;
}

function $runYield(gen, res = { done: false, value: undefined }) {
  setTimeout(_ => {
    if ($isStop()) {
      return $onStop();
    }
    res = gen.next();
    if (res.done) {
      return $onDone(res.value);
    }
    else {
      return $runYield(gen, res);
    }
  }, 0)
}
