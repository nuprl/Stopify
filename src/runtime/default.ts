
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
  stop: number | undefined
}

export function parseRuntimeOpts(rawArgs: string[], filename?: string): Opts {

  const args = minimist(rawArgs, parseOpts);

  if ((args._.length === 1 || typeof filename === "string") === false) {
    throw new Error(`Missing filename`);
  }
  if (['number', 'undefined'].includes(typeof args.yield) === false) {
    throw new Error(`--yield must be a number (or omitted)`);
  }
  if (['number', 'undefined'].includes(typeof args.stop) === false) {
    throw new Error(`--stop must be a number in seconds (or omitted)`);
    process.exit(1);
  }

  filename = filename || args._[0];

  let yieldInterval : number | undefined;

  if (typeof args.yield === 'number') {
    yieldInterval = args.yield;
  }
  else if (typeof args.yield === 'undefined') {
    yieldInterval = NaN;
  }
  else {
    throw 'Yield interval must be a number';
  }

  return { 
    filename: filename, 
    yieldInterval: yieldInterval!,
    stop: args.stop
  };

}

export function run(M: Stoppable, opts: Opts, done: () => void): void {
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
    const runningTime = endTime - startTime;
    console.log(`${opts.filename},${runningTime},${yields}`);
    done();
  }

  const startTime = Date.now();

    if (typeof opts.stop !== 'undefined') {
    setTimeout(() => mustStop = true, opts.stop * 1000);
  }

  M(isStop, onStop, onDone, opts.yieldInterval);
}