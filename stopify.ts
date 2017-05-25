#!/usr/bin/env node
import { yieldStopify } from './src/stopifyYield'
import { cpsStopify } from './src/stopifyCPSEval'
import { regeneratorStopify } from './src/stopifyRegenerator'
import { StopWrapper } from './src/helpers'
import * as fs from 'fs'
import * as path from 'path'

const argv = require('minimist')(process.argv.slice(2));
const filename = argv.file || argv.i
const timeFlag = !argv.notime || true;

const code = fs.readFileSync(
  path.join(process.cwd(), filename), 'utf-8').toString()

const transform = argv.transform || argv.t
const output = argv.output || argv.o || 'print';
if (transform === undefined) {
  throw new Error('No transformation was specified')
}

let stopifyFunc;
const sw: StopWrapper = new StopWrapper();
switch(transform) {
  case 'yield':
    stopifyFunc = yieldStopify
    break;
  case 'cps':
    stopifyFunc = cpsStopify
    break;
  case 'regen':
    stopifyFunc = regeneratorStopify
    break;
  default:
    throw new Error(`Unknown transform: ${transform}`)
}

let compileTime: number = 0;
let stoppable;
if(timeFlag) {
  const compileStart = process.hrtime();
  stoppable = stopifyFunc(code, sw.isStop, sw.stop)
  const compileEnd = process.hrtime(compileStart);
  compileTime = (compileEnd[0] * 1e9 + compileEnd[1]) * 1e-9
} else {
  stoppable = stopifyFunc(code, sw.isStop, sw.stop)
}

const yieldInterval = argv.y || argv.yieldInterval
if (yieldInterval !== undefined) {
  let interval = parseInt(argv.y || argv.yieldInterval)
  if (isNaN(interval)) throw new Error(`Unknown interval: ${yieldInterval}`)
  stoppable.setInterval(interval);
}

switch(output) {
  case 'print':
    console.log(stoppable.transformed)
    if(timeFlag) {
      console.log(`// Compilation time: ${compileTime}s`)
    }
    break;
  case 'eval':
    if(timeFlag) {
      const runStart = process.hrtime();
      stoppable.run(x => {
        console.log(`Compilation time: ${compileTime}s`)
        const runEnd = process.hrtime(runStart);
        console.log(`Runtime: ${(runEnd[0] * 1e9 + runEnd[1]) * 1e-9}s`)
      })
    } else {
      stoppable.run(x => x)
    }
    break;
  default:
    throw new Error(`Unknown output format: ${output}`)
}
