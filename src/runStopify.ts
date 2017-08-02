import * as minimist from 'minimist';
import * as types from './types';
import * as assert from 'assert';
import * as path from 'path';

const parseOpts = {
  alias: { 
    "y": "yield"
  }
};

const args = minimist(process.argv.slice(2), parseOpts);

if (args._.length !== 1) {
  throw 'Expected one file';
}
if (!(typeof args.yield === 'undefined' || typeof args.yield === 'number')) {
  throw 'Expected number';
}

const srcModule = path.relative(__dirname, args._[0]);
const yieldInterval = <number>(args.yield || NaN);

const M: types.Stoppable = require(srcModule);

let yields = 0;

function isStop() {
  yields++;
  return false;
}

function onStop() {
}

function onDone() {
  const endTime = Date.now();
  const t = endTime - startTime;
  console.log(`${t},${yields}`);
}

const startTime = Date.now();

M(isStop, onStop, onDone, yieldInterval);
