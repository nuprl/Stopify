
import { Opts, Stoppable } from '../types';
import * as minimist from 'minimist';

const parseOpts = {
  alias: { 
    "y": "yield",
    "l": "latency",
  }
};

export function parseRuntimeOpts(rawArgs: string[], filename?: string): Opts {

  const args = minimist(rawArgs, parseOpts);

  if ((args._.length === 1 || typeof filename === "string") === false) {
    throw new Error(`Missing filename`);
  }

  if (['number', 'undefined'].includes(typeof args.yield) === false) {
    throw new Error(`--yield must be a number (or omitted)`);
  }

  if (!(typeof args.latency === 'undefined' ||
       (typeof args.latency === 'number' && isFinite(args.latency)))) {
    throw new Error(`--latency must be a number (or omitted)`);
  }

  if (typeof args.yield === 'number' && typeof args.latency === 'number') {
    throw new Error(`cannot specify both --yield and --latency`);
  }

  if (['number', 'undefined'].includes(typeof args.stop) === false) {
    throw new Error(`--stop must be a number in seconds (or omitted)`);
  }

  filename = filename || args._[0];

  let yieldMethod : 'fixed' | 'flexible';
  let yieldInterval : number | undefined;

  if (typeof args.latency === 'number') {
    yieldMethod = 'flexible';
    yieldInterval = args.latency;
  }
  else if (typeof args.yield === 'number' && args.yield > 0) {
    yieldMethod = 'fixed';
    yieldInterval = args.yield;
  }
  else {
    yieldMethod = 'fixed';
    yieldInterval = NaN;
  }

  let execEnv : 'browser' | 'node';
  if (typeof args.env !== 'string') {
    execEnv = 'node';
  } else if (args.env === 'browser') {
    execEnv = 'browser';
  } else if (args.env === 'node') {
    execEnv = 'node';
  } else {
    throw new Error(`--env must be either 'browser' or 'node'`);
  }

  return { 
    filename: filename, 
    yieldInterval: yieldInterval!,
    yieldMethod: yieldMethod,
    stop: args.stop,
    env: execEnv,
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
    console.log(`${runningTime},${yields}`);
    done();
  }

  if (opts.env === 'browser') {
    console.log = function (data: any) {
      var div = document.getElementById('data')!;
      div.innerHTML = div.innerHTML + ", " + data;
    }
    window.onerror = () => {
      var div = document.getElementById('data')!;
      div.innerHTML = `, Failed`
      window.document.title = "done"
    }
  }

  const startTime = Date.now();

  if (typeof opts.stop !== 'undefined') {
    setTimeout(() => mustStop = true, opts.stop * 1000);
  }

  M(isStop, onStop, onDone, opts);
}
