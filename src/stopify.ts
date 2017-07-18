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

function showUsage() {
  console.error(
    `
Usage: stopify.js -i <filename> -t [cps|tcps|callcc|yield|regen] [options]
Options:
       -y, --interval     Set yield interval
       -o, --output       Can be print, eval, stop
       -d, --debug        Print debugging info to stderr
       --optimize         Enable optimization passes
       --tailcalls        Support tail calls (for yield)
       --no_eval          Assume safe eval
    `)
  process.exit(0);
}

const argv = require('minimist')(process.argv.slice(2));
if (argv.h || argv.help) {
  showUsage();
}
let code: string = "";
if (argv.h || argv.help) {
  showUsage()
}
if (argv.i) {
  const filename = argv.file || argv.i
  code = fs.readFileSync(
    path.join(process.cwd(), filename), 'utf-8').toString()
} else {
  console.log('No input')
  showUsage();
}
if (!code) {
  throw new Error('Failed to read file')
}

const transform: string = argv.transform || argv.t
const output = argv.output || argv.o || 'print';

if (transform === undefined) {
  console.log('No transformation was specified')
  showUsage();
}

let interval = argv.y || argv.yieldInterval || NaN
if (interval !== undefined) {
  interval = parseInt(argv.y || argv.yieldInterval)
}

let opts: Options = {
  debug: argv.d || argv.debug || false,
  optimize: argv.optimize || false,
  no_eval: argv.no_eval || false,
  tail_calls: argv.tailcalls || false,
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
const runnableProg =
  `const s = Date.now();
      (${prog}).call(this, _ => false, () => 0, () => {
        const e = Date.now();
        console.log("Runtime: " + (e - s) + "ms");
      }, //|INTERVAL|
      ${interval})`
console.log(`// Compilation time: ${ctime}ms`)

switch(output) {
  case 'html': {
    const html = `<html><body><script>${runnableProg}</script></body></html>`
    console.log(html)
    break;
  }
  case 'print': {
    console.log(runnableProg)
    break;
  }
  case 'eval': {
    eval(runnableProg)
    break;
  }
  case 'stop': {
    let stopifyFunc;
    switch(transform) {
      case 'yield':
        stopifyFunc = yieldStopify;
        break;
      case 'regen':
        stopifyFunc = regenStopify;
        break;
      case 'cps':
        stopifyFunc = cpsStopify;
        break;
      case 'tcps':
        stopifyFunc = tcpsStopify;
        break;
      case 'callcc':
        stopifyFunc = callCCStopify;
        break;
      default:
        throw new Error(`Unknown transform: ${transform}`)
    }
    let ctime = "";
    let prog;
    const stime = process.hrtime()
    prog = stopifyFunc(code, opts)
    ctime = timeInSecs(process.hrtime(stime))
    console.log(`// Compilation time: ${ctime}s`)
    const sw: StopWrapper = new StopWrapper();
    let rtime = "";
    if (process) {
      const stime = process.hrtime()
      prog(sw.isStop.bind(sw), () =>{
        const rtime = process.hrtime(stime)
        console.log(`// Stop time: ${timeInSecs(rtime)}`)
      }, () => {}, interval)
      setTimeout(_ => {
        sw.stop()
      }, 1000)
    }
    break;
  }
  default:
    break;
}
