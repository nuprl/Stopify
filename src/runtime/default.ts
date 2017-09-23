
import { Opts, Stoppable, ElapsedTimeEstimatorName } from '../types';
import * as minimist from 'minimist';
import { sum, parseArg } from '../generic';
import { sprintf } from 'sprintf';
import * as commander from 'commander';
import { makeRTS } from '../rts';
import * as path from 'path';

commander.option(
  '-y, --yield <interval>',
  'time between yields to the event loop (default: never yield)',
  parseArg(parseInt, x => x > 0, '--yield requires a number'),
  NaN);

commander.option(
  '-e, --env <env>', 
  'the runtime environment (default: node)',
  parseArg(x => x, 
    (x) => /^(chrome|firefox|node)$/.test(x), 
    '--env must be chrome, firefox, or node'),
  'node');

commander.option(
  '--variance',
  'measure time elapsed between each yield (default: false)');

commander.option(
  '--time-per-elapsed <interval>',
  `an estimate of the time that elapses between calls to the internal suspend \
function (default: 1)`,
   parseArg(parseInt, (x) => x > 0, 
    '--time-per-elapsed expects a positive integer'),
   1);

commander.option(
  '--stop <duration>',
  'the time after which the program should be terminated (default: never stop)',
  parseArg(parseInt, (x) => x > 0,
    '--stop expects a positive integer'));

commander.option(
  '--estimator <estimator>',
  `one of exact, reservoir, or countdown (default: countdown)`,
  parseArg(x => x, x => /^(exact|reservoir|countdown)$/.test(x),
    'invalid --estimator value'),
  'countdown');

commander.option(
  '-t, --transform <transform>',
  'the transformation used to compile the program',
  parseArg(x => x,
    (x) => /^(eager|retval|lazy|original)$/.test(x),
    'invalid --transform'));

commander.arguments('<filename>');


export function parseRuntimeOpts(rawArgs: string[], filename?: string): Opts {

  const args = commander.parse(["", "", ...rawArgs]);

  filename = filename || args.args[0];
  if (typeof filename !== 'string') {
    throw new Error(`Missing filename`);
  }

  return {
    transform: args.transform,
    filename: filename,
    yieldInterval: args.yield,
    estimator: args.estimator,
    timePerElapsed: args.timePerElapsed,
    stop: args.stop,
    env: args.env,
    variance: args.variance
  };
  return <any>null;
}

const fakeRTS = {
  onYield() {
  },
  delimit(thunk: () => void) {
    thunk()
  }
}

export function run(M: (() => void) | undefined, opts: Opts, done: () => void): void {
  const rts = opts.transform === 'original' ? fakeRTS : makeRTS(opts);
  let yields = 0;
  let mustStop = false;
  let lastStopTime: number | undefined;
  let stopIntervals: number[] = [];

  rts.onYield = function() {
    yields++;
    if (opts.variance) {
      const now = Date.now();
      if (typeof lastStopTime === 'number') {
        stopIntervals.push(now - lastStopTime);
      }
      lastStopTime = now;
    }
    if (mustStop) {
      onDone();
    }
    return !mustStop;
  }

  function onDone() {
    const endTime = Date.now();
    const runningTime = endTime - startTime;
    const latencyAvg = runningTime / yields;
    let latencyVar;
    console.log("BEGIN STOPIFY BENCHMARK RESULTS");
    if (opts.variance) {
      console.log("BEGIN VARIANCE")
      for (let i = 0; i < stopIntervals.length; i++) {
        console.log(`${i},${stopIntervals[i]}`);
      }
      console.log("END VARIANCE");
      if (yields === 0) {
        latencyVar = "0";
      }
      else {
        latencyVar = sprintf("%.2f",
          sum(stopIntervals.map(x => 
            (latencyAvg - x) * (latencyAvg - x))) / yields);
      }
    }
    else {
      latencyVar = 'NA'; 
    }
    console.log(`${runningTime},${yields},${sprintf("%.2f", latencyAvg)},${latencyVar}`);
    done();
  }

  if (opts.env !== 'node') {
    const data = <HTMLTextAreaElement>document.getElementById('data')!;
    console.log = function (str: any) {
      data.value = data.value + str + '\n';
    }
    window.onerror = (message: any) => {
      data.value = data.value + '\nAn error occurred:\n' + message + '\n';
      window.document.title = "done"
    }
  }

  const startTime = Date.now();

  if (typeof opts.stop !== 'undefined') {
    setTimeout(() => mustStop = true, opts.stop * 1000);
  }

  if (M) {
     M();
  }
  else {
    // This causes a "critical dependency" warning in Webpack. However, it is
    // never evaluated on the browser.
    require(path.relative(__dirname, path.resolve(opts.filename)));
  }
  rts.delimit(onDone);
}
