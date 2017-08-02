'use strict';

import { yieldStopifyPrint } from './yield/stopifyYield'
import { regenStopifyPrint } from './yield/stopifyRegen'
import { cpsStopifyPrint } from './cps/stopifyCps'
import { tcpsStopifyPrint } from './cps/stopifyTCps'
import { shamStopifyPrint } from './sham/stopifySham'
import { stopifyPrint } from './interfaces/stopifyInterface'
import { StopWrapper, Options } from './common/helpers'
import * as fs from 'fs'
import * as path from 'path'
const browserify = require('browserify')
const streamToString = require('stream-to-string')
const tmp = require('tmp');

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
  .option('--noeval', 'Assume safe eval')
  .option('--benchmark', 'Output benchmarking information')
  .parse(process.argv)

function readFile(f: string): [string, string] {
  const code = fs.readFileSync(path.join(process.cwd(), f), 'utf-8').toString();
  if(!code) {
    throw new Error(`Failed to read from ${f}`)
  } else {
    return [f, code];
  }
}

function readTransform(str: string): string {
  const validTransforms = ['cps', 'tcps', 'yield', 'regen', 'sham'];
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

function browserifyString(str: string, cb: (err: any, value: any) => any): void {
  const tmpFile = 'stopify_build' + Math.floor(Math.random() * 10000) + '.js'

  fs.writeFileSync(tmpFile, str, 'utf8')
  const outJs = browserify(tmpFile, {}).bundle()
  streamToString(outJs, 'utf8', (e: any, v: any) => {
    fs.unlinkSync(tmpFile); cb(e, v)
  })
}

const code: string = program.input[1];
const transform: string = program.transform;
const output: string = program.output || 'print';
const interval: number = program.interval || NaN;
const benchmark: boolean = program.benchmark || false;

let opts: Options = {
  debug: program.debug,
  optimize: program.optimize,
  no_eval: program.noeval,
  tail_calls: program.tailcalls,
}

// The string returned by this function should be embedded inside ``.
function optsToString(obj: object): string {
  let ret = `interval: \${// |INTERVAL|
  ${String(interval)}}`
  for(let k in obj) {
    const v = String((<any>obj)[k])
    ret =
      v ?
        (ret ? `${ret}, ${k}: ${v}` : `${k}: ${v}`)
        : ret
  }
  return ret;
}

let reportOpts = optsToString({
  filename: program.input[0],
  transform,
  debug: program.debug || false,
  optimize: program.optimize || false,
  no_eval: program.noeval || false,
  tail_calls: program.tailcalls || false,
})

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
  case 'sham':
    stopifyFunc = shamStopifyPrint
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
setTimeout = function (f, t) {
  const $$currDate = Date.now();
  $$measurements.push($$currDate - $$oldDate);
  $$oldDate = $$currDate;
  $$internalSetTimeout(f, t);
}`

const benchmarkingData = `
const $$ml = $$measurements.length
let $$latencyAvg, $$latencyVar;
if ($$ml < 1) {
  $$latencyVar = $$latencyAvg = NaN
} else {
  $$latencyAvg = $$measurements.reduce((x, y) => x + y)/$$ml;
  $$latencyVar = $$measurements.map(x => Math.pow(x - $$latencyAvg, 2))
                               .reduce((x, y) => x + y)/$$ml;
}
console.error("Latency measurements(in ms): " + $$ml +
            ", avg(in ms): " + $$latencyAvg +
            ", var(in ms): " + $$latencyVar);
console.error(\`${reportOpts}\`);
`

const onDone = `() => {
  console.error('Compilation time(in ms): ${ctime}')
  const e = Date.now();
  // s is defined at the start of the program
  console.error("Runtime(in ms): " + (e - s));
  ${benchmark ? benchmarkingData.toString() : ""}
}`


switch(output) {
  case 'html': {
    const onDone =
    `() => {
      console.error('Compilation time(in ms): ${ctime}')
      const e = Date.now();
      // s is defined at the start of the program
      console.error("Runtime(in ms): " + (e - s));
      ${benchmark ? benchmarkingData.toString() : ""}
      document.title = "done"
    }`

    const runnableProg =
    `
    console.error = function (data) {
      var div = document.getElementById('data');
      div.innerHTML = div.innerHTML + ", " + data;
    }
    ${benchmark ? latencyMeasure.toString() : ''}
    const s = Date.now();
    (${prog}).call(this, _ => false, () => 0, ${onDone}, // |INTERVAL|
        ${interval})
    `

    browserifyString(runnableProg, (err: any, browserified: string) => {
      const html =
        `<html>
          <title></title>
          <body>
            <div id='data'></div>
            <script type="text/javascript">
              window.onerror = () => {
                var div = document.getElementById('data');
                div.innerHTML = \`, Failed ${benchmark? ",,,," : "" },${reportOpts}\`
                document.title = "done"
              }
              ${browserified}
            </script>
          </body>
        </html>`
      console.log(html)
    })
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
