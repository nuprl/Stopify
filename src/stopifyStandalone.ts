'use strict';

import {
  yieldStopify, yieldStopifyPrint
} from './stopifyStandaloneImpl/stopifyYield'
import {
  cpsStopify, cpsStopifyPrint
} from './stopifyStandaloneImpl/stopifyCps'
import {
  tcpsStopify, tcpsStopifyPrint
} from './stopifyStandaloneImpl/stopifyTCps'
import { StopWrapper } from './helpers'
import * as fs from 'fs'
import * as path from 'path'

function showUsage() {
  console.log('Usage: stopify.js -i <filename> -t [cps|tcps|yield|regen] [options]');
  console.log('       stopify.js -s <string> -t [cps|tcps|yield|regen] [options]\n');
  console.log('Options:')
  console.log('  -y, --interval     Set yield interval')
  console.log('  -o, --output       Can be print, eval, benchmark')
  process.exit(0);
}

const argv = require('minimist')(process.argv.slice(2));
if (argv.h || argv.help) {
  showUsage();
}
let code;
if (argv.s) {
  code = argv.s;
} else if (argv.file || argv.i) {
  const filename = argv.file || argv.i
  code = fs.readFileSync(
    path.join(process.cwd(), filename), 'utf-8').toString()
} else {
  console.log('No input')
  showUsage();
}

const transform = argv.transform || argv.t
const output = argv.output || argv.o || 'print';

if (transform === undefined) {
  console.log('No transformation was specified')
  showUsage();
}


let interval = argv.y || argv.yieldInterval || 10
if (interval !== undefined) {
  let interval = parseInt(argv.y || argv.yieldInterval)
  if (isNaN(interval)) {
    interval = 10;
  }
}

function timeInSecs(time: number[]): string {
  return `${time[0] + time[1] * 1e-9}`
}

switch(output) {
  case 'print': {
    let stopifyFunc;
    switch(transform) {
      case 'yield':
        stopifyFunc = yieldStopifyPrint
        break;
      case 'cps':
        stopifyFunc = cpsStopifyPrint
        break;
      case 'tcps':
        stopifyFunc = tcpsStopifyPrint
        break;
      default:
        throw new Error(`Unknown transform: ${transform}`)
    }
    let time = "";
    let prog;
    if (process) {
      const stime = process.hrtime()
      prog = stopifyFunc(code)
      time = timeInSecs(process.hrtime(stime))
    } else {
      prog = stopifyFunc(code)
    }
    const runnableProg = `(${prog})(_ => false, () => 0, x => x, ${interval})`
    console.log(runnableProg)
    console.log(`// Compilation time: ${time}s`)
    break;
  }
  case 'eval': {
    let stopifyFunc;
    switch(transform) {
      case 'yield':
        stopifyFunc = yieldStopify;
        break;
      case 'cps':
        stopifyFunc = cpsStopify;
        break;
      case 'tcps':
        stopifyFunc = tcpsStopify;
        break;
      default:
        throw new Error(`Unknown transform: ${transform}`)
    }
    let ctime = "";
    let prog;
    if (process) {
      const stime = process.hrtime()
      prog = stopifyFunc(code)
      ctime = timeInSecs(process.hrtime(stime))
      console.log(`// Compilation time: ${ctime}s`)
    } else {
      prog = stopifyFunc(code)
    }
    const sw: StopWrapper = new StopWrapper();
    let rtime = "";
    if (process) {
      const stime = process.hrtime()
      prog(sw.isStop.bind(sw), sw.onStop.bind(sw), () => {
        const rtime = process.hrtime(stime)
        console.log(`// Runtime : ${timeInSecs(rtime)}s`)
      }, interval)
    }
    break;
  }
  default:
    break;
}
