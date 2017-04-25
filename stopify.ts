#!/usr/bin/env node
import { yieldStopify } from './src/stopifyYield'
import { cpsStopify } from './src/stopifyCPSEval'
import { StopWrapper } from './src/helpers'
import * as fs from 'fs'
import * as path from 'path'

const argv = require('minimist')(process.argv.slice(2));
const filename = argv.file || argv.i

const code = fs.readFileSync(
  path.join(process.cwd(), filename), 'utf-8').toString()

const transform = argv.transform || argv.t
const output = argv.output || argv.o || 'print';
if (transform === undefined) {
  throw new Error('No transformation was specified')
}

let stoppable;
const sw: StopWrapper = new StopWrapper();
switch(transform) {
  case 'yield':
    stoppable = yieldStopify(code, sw.isStop, sw.onStop, sw.stop);
    break;
  case 'cps':
    stoppable = cpsStopify(code, sw.isStop, sw.onStop, sw.stop);
    break;
  default:
    throw new Error(`Unknown transform: ${transform}`)
}

switch(output) {
  case 'print':
    console.log(stoppable.transformed)
    break;
  case 'eval':
    stoppable.run()
    break;
  default:
    throw new Error(`Unknown output format: ${output}`)
}
