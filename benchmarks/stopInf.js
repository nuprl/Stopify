// Move this file to the root of the project to make it run properly.

const yieldStopify = require('../built/src/stopifyYield').yieldStopify;
const cpsStopify = require('../built/src/stopifyCPSEval.js').cpsStopify;
const StopWrapper = require('../built/src/helpers').StopWrapper;
const process = require('process')

const code = `
let iter = 0;
while(true) {
  console.log(iter++)
}
`

const sw = new StopWrapper();

const stoppable = yieldStopify(code, sw.isStop, sw.stop);

stoppable.run(x => console.log(x))
const startTime = process.hrtime()
stoppable.stop(x => console.log(process.hrtime(startTime)))
