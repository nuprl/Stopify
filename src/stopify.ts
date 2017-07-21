'use strict';

import {
  yieldStopify, yieldStopifyPrint
} from './yield/stopifyYield'
import {
  regenStopify, regenStopifyPrint
} from './yield/stopifyRegen'
import {
  cpsStopify, cpsStopifyPrint
} from './cps/stopifyCps'
import {
  callCCStopify, callCCStopifyPrint
} from './callcc/stopifyCallCC'
import {
  tcpsStopify, tcpsStopifyPrint
} from './cps/stopifyTCps'
import { stopifyPrint } from './interfaces/stopifyInterface'
import { StopWrapper, Options } from './common/helpers'
import * as fs from 'fs'
import * as path from 'path'

const program = require('commander');

program
  .usage('Usage: stopify -i <file> -t <transform> [options] ')
  .option('-i, --input <filename>', 'The input file', readFile)
  .option('-t, --transform <transform>', 'The stopify transform', readTransform)
  .option('-o, --output <mode>', 'Specify output mode', readOutputMode)
  .option('-y, --interval <n>', 'Set the yield interval', parseInt)
  .option('-d, --debug', 'Enable debugging')
  .option('--optimize', 'Enable optimization pass')
  .option('--tailcalls', 'Enable tailcalls (for generator based transform)')
  .option('--no-eval', 'Assume safe eval')
  .option('--benchmark', 'Output benchmarking information')
  .parse(process.argv)


function readFile(f: string): string {
  const code = fs.readFileSync(path.join(process.cwd(), f), 'utf-8').toString();
  if(!code) {
    throw new Error(`Failed to read from ${f}`)
  } else {
    return code;
  }
}

function readTransform(str: string): string {
  const validTransforms = ['cps', 'tcps', 'callcc', 'yield', 'regen'];
  if(validTransforms.includes(str)) {
    return str;
  } else {
    throw new Error(`${str} is not a valid transform.` +
      ` Specify one of ${validTransforms.join(', ')}`)
  }
}

function readOutputMode(s: string): string {
  const outputModes = ['print', 'eval', 'stop', 'html'];
  if(outputModes.includes(s)) {
    return s;
  } else {
    throw new Error(`${s} is not a valid output mode` +
      `. Specify one of ${outputModes.join(', ')}`)
  }
}

const code: string = program.input;
const transform: string = program.transform;
const output: string = program.output || 'print';
const interval: number = program.interval;
const benchmark: boolean = program.benchmark || false;

let opts: Options = {
  debug: program.debug,
  optimize: program.optimize,
  no_eval: program.noEval,
  tail_calls: program.tailcalls,
}

function timeInSecs(time: number[]): string {
  return `${time[0] + time[1] * 1e-9}`
}

let stopifyFunc: stopifyPrint;
switch(transform) {
  case 'yield':
    stopifyFunc = yieldStopifyPrint
    break;
  case 'regen':
    stopifyFunc = regenStopifyPrint
    break;
  case 'cps':
    stopifyFunc = cpsStopifyPrint
    break;
  case 'tcps':
    stopifyFunc = tcpsStopifyPrint
    break;
  case 'callcc':
    stopifyFunc = callCCStopifyPrint
    break;
  default:
    throw new Error(`Unknown transform: ${transform}`)
}
const stime = Date.now()
const prog = stopifyFunc(code, opts)
const ctime = (Date.now() - stime)
const latencyMeasure =
`
let $$oldDate = Date.now();
const $$measurements = [];
const $$internalSetTimeout = (typeof window === "object" ? window : global).setTimeout;
let setTimeout = function (f, t) {
  const $$currDate = Date.now();
  $$measurements.push($$currDate - $$oldDate);
  $$oldDate = $$currDate;
  $$internalSetTimeout(f, t);
}`

const benchmarkingData = `
console.error("Options: " + JSON.stringify(${JSON.stringify(opts)}));
const $$ml = $$measurements.length
const $$latencyAvg = $$measurements.reduce((x, y) => x + y)/$$ml;
const $$latencyVar = $$measurements.map(x => Math.pow(x - $$latencyAvg, 2))
                                   .reduce((x, y) => x + y)/$$ml;
console.error("Latency measurements: " + $$ml +
            ", avg: " + $$latencyAvg +
            "ms, var: " + $$latencyVar + "ms");
`

const onDone = `() => {
  console.error('Compilation time: ${ctime}ms')
  const e = Date.now();
  // s is defined at the start of the program
  console.error("Runtime: " + (e - s) + "ms");
  ${benchmark ? benchmarkingData.toString() : ""}
}`


switch(output) {
  case 'html': {
    const runnableProg =
`
console.error = function (data) {
  var div = document.getElementById('data');
  div.innerHTML = div.innerHTML + "," + data;
}
${benchmark ? latencyMeasure.toString() : ''}
const s = Date.now();
(${prog}).call(this, _ => false, () => 0, ${onDone}, // |INTERVAL|
    ${interval})
`
    const html = `
    <html>
      <body>
        <div id='data'></div>
        <script type="text/javascript">
          ${runnableProg}
        </script>
      </body>
    </html>`
    console.log(html)
    break;
  }
  case 'print': {
    const runnableProg =
`
    ${benchmark ? latencyMeasure.toString() : ''}
const s = Date.now();
(${prog}).call(this, _ => false, () => 0, ${onDone}, // |INTERVAL|
    ${interval})
`
    console.log(runnableProg)
    break;
  }
  case 'eval': {
    const runnableProg =
`
    ${benchmark ? latencyMeasure.toString() : ''}
const s = Date.now();
(${prog}).call(this, _ => false, () => 0, ${onDone}, // |INTERVAL|
    ${interval})
`
    eval(runnableProg)
    break;
  }
  case 'stop': {
    const isStop =
`
() => {
  // Stop after 1000ms,
  const r = (Date.now() - $$stopCheck) > 1000
  return r;
}
`
    const runnableProg: string =
`
    ${benchmark ? latencyMeasure.toString() : ''}
const $$stopCheck = Date.now();
const s = Date.now();
(${prog}).call(this, ${isStop}, ${onDone}, ${onDone}, // |INTERVAL|
    ${interval})
`
    eval(runnableProg)
    break;
  }
  default:
    throw new Error(`Unknown output format: ${output}`)
    break;
}
