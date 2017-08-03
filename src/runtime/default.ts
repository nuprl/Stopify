
import { Stoppable } from '../types';
import * as minimist from 'minimist';

const parseOpts = {
  alias: { 
    "y": "yield"
  }
};

interface Opts {
  filename: string,
  yieldInterval: number,
  appArgs: string[]
}

export function parseRuntimeOpts(args: string[], filename?: string): Opts {

  const rawOpts = minimist(args, parseOpts);

  if (rawOpts._.length >= 1 || filename) {
    filename = filename || rawOpts._[0];
  }
  else {
    throw 'Expected one file';
  }

  let appArgs: string[] | undefined;

  if (rawOpts._.length >= 2) {
    appArgs = rawOpts._.slice(1);
  }
  else if (rawOpts._.length === 1) {
    appArgs = [];
  }
  else {
    throw new Error(`Expected at least a filename`);
  }

  let yieldInterval : number | undefined;

  if (typeof rawOpts.yield === 'number') {
    yieldInterval = rawOpts.yield;
  }
  else if (typeof rawOpts.yield === 'undefined') {
    yieldInterval = NaN;
  }
  else {
    throw 'Yield interval must be a number';
  }

  return { 
    filename, 
    yieldInterval: yieldInterval!,
    appArgs: appArgs!
   };

}

export function run(M: Stoppable, opts: Opts, done: () => void): void {
  let yields = 0;

  function isStop() {
    yields++;
    return false;
  }

  function onStop() {
  }

  function onDone() {
    const endTime = Date.now();
    const runningTime = endTime - startTime;
    console.log(`${opts.filename},${runningTime},${yields}`);
    done();
  }

  const startTime = Date.now();

  M(isStop, onStop, onDone, opts.yieldInterval, opts.appArgs);
}