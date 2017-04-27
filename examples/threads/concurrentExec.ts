const yieldStopify = require('./src/stopifyYield').yieldStopify;
const StopWrapper = require('./src/helpers').StopWrapper;

const code = `
function sum(n, acc) {
  if (n === 0) return acc;
  else return sum(n-1, n + acc)
}

sum(1000, 0)
`

const onDone = function (res) { console.log(res + 7) }

const sw = new StopWrapper(onDone)

const stoppable = yieldStopify(code, sw.isStop, sw.stop);

stoppable.run(x => console.log(x + 1))
stoppable.run(x => console.log(x + 2))
stoppable.run(x => console.log(x + 3))
