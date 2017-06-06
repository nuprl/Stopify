#!/usr/bin/env node
import { yieldSteppify } from './stepifyImplementation/steppifyYield'
import { StopWrapper } from './helpers'
import * as fs from 'fs'
import * as path from 'path'

function showUsage() {
  console.log('Usage: steppify.js -i <filename> -t [cps|yield|regen] [options]');
  console.log('       steppify.js -s <string> -t [cps|yield|regen] [options]\n');
  console.log('Options:')
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

let steppifyFunc;
const sw: StopWrapper = new StopWrapper();
switch(transform) {
  case 'yield':
    steppifyFunc = yieldSteppify
    break;
  default:
    throw new Error(`Unknown transform: ${transform}`)
}

const compileStart = process.hrtime();
const steppable = steppifyFunc(code, [], sw.isStop, sw.stop, () => console.log('Clicked step'))
const compileEnd = process.hrtime(compileStart);
const compileTime = (compileEnd[0] * 1e9 + compileEnd[1]) * 1e-9

switch(output) {
  case 'print': {
    console.log(steppable.transformed)
    console.log(`// Compilation time: ${compileTime}s`)
    break;
  }
  case 'eval': {
    const runStart = process.hrtime();
    steppable.run(() => {
      console.log(`Compilation time: ${compileTime}s`)
      const runEnd = process.hrtime(runStart);
      console.log(`Runtime: ${(runEnd[0] * 1e9 + runEnd[1]) * 1e-9}s`)
    })
    break;
  }
  case 'benchmark': {
    const runStart = process.hrtime();
    steppable.run(() => {
      const runEnd = process.hrtime(runStart);
      process.stdout.write(`${(runEnd[0] * 1e9 + runEnd[1]) * 1e-9}`)
    })
    break;
  }
  default:
    console.log(`Unknown output format: ${output}`)
    console.log(steppable.transformed)
    console.log(`// Compilation time: ${compileTime}s`)
    break;
}
