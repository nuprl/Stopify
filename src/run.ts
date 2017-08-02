import * as minimist from 'minimist';
import * as types from './types';
import * as assert from 'assert';
import * as path from 'path';

const stderr = process.stderr;

const parseArgs = {
  alias: { 
    "y": "yield"
  }
};
const args = minimist(process.argv.slice(2), parseArgs);

if (args._.length !== 1) {
  stderr.write(`Missing filename`);
  process.exit(1);
}
if (['number', 'undefined'].includes(typeof args.yield) === false) {
  stderr.write(`--yield must be a number (or omitted)`);
  process.exit(1);
}

if (['number', 'undefined'].includes(typeof args.stop) === false) {
  stderr.write(`--stop must be a number in seconds (or omitted)`);
  process.exit(1);
}

const srcModule = path.relative(__dirname, args._[0]);
const yieldInterval = <number>(args.yield || NaN);

const M: types.Stoppable = require(srcModule);

let yields = 0;
let mustStop = false;

function isStop() {
  yields++;
  return mustStop;
}

function onStop() {
  onDone();
}

function onDone() {
  const endTime = Date.now();
  const t = endTime - startTime;
  console.log(`${t},${yields}`);
}

const startTime = Date.now();

if (typeof args.stop !== 'undefined') {
  setTimeout(() => mustStop = true, args.stop * 1000);
}

M(isStop, onStop, onDone, yieldInterval);

