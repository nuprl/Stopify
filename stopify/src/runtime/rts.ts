import * as assert from 'assert';
import { sprintf } from 'sprintf';
import { unreachable, Runtime } from 'stopify-continuations/dist/src/runtime';
import * as elapsedTimeEstimator from './elapsedTimeEstimator';
import runtime from './default';
import { Opts } from '../types';
import { RuntimeWithSuspend } from './suspend';
import { parseRuntimeOpts } from '../cli-parse';
import { sum } from '../generic';

function makeEstimator(opts: Opts): elapsedTimeEstimator.ElapsedTimeEstimator {
  if (opts.estimator === 'exact') {
    return elapsedTimeEstimator.makeExact();
  }
  else if (opts.estimator === 'countdown') {
    return elapsedTimeEstimator.makeCountdown(opts.timePerElapsed!);
  }
  else if (opts.estimator === 'reservoir') {
    return elapsedTimeEstimator.makeSampleAverage();
  }
  else if (opts.estimator === 'velocity') {
    return elapsedTimeEstimator.makeVelocityEstimator(opts.resampleInterval);
  }
  else {
    return unreachable();
  }
}

import * as cont from 'stopify-continuations/dist/src/runtime';

export function init(contRTS: cont.Runtime) {
  if (rts) {
    return rts;
  }

  const opts = parseRuntimeOpts(process.argv.slice(2));
  const estimator = makeEstimator(opts);
  rts = new RuntimeWithSuspend(contRTS, opts.yieldInterval, estimator);

  const startTime = Date.now();
  let lastStopTime: number | undefined;
  let stopIntervals: number[] = [];
  let yields = 0;
  let shouldStop = false;
  rts.onYield = () => {
    yields++;
    if (opts.variance) {
      const now = Date.now();
      if (typeof lastStopTime === 'number') {
        stopIntervals.push(now - lastStopTime);
      }
      lastStopTime = now;
    }
    return !shouldStop;
  }

  rts.onEnd = () => {
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
      if (this.yields === 0) {
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
  };

  if (typeof opts.stop !== 'undefined') {
    setTimeout(() => {
      shouldStop = true;
    },  opts.stop * 1000);
  }


  return rts;
}

let rts : RuntimeWithSuspend | undefined = undefined;


function getOpts(): Opts {
  const opts = JSON.parse(
    decodeURIComponent(window.location.hash.slice(1)));
  // JSON turns undefined into null, which compare differently with numbers.
  for (const k of Object.keys(opts)) {
    if (opts[k] === null) {
      delete opts[k];
    }
  }
  return opts;
}

export function afterScriptLoad(M : any) {
  // NOTE(arjun): Idiotic that we are doing this twice
  const opts = getOpts();
  runtime.run(M, opts,  () => {
    window.document.title = "done";
  });
}

export function loadScript(onload: () => any, prefix?: string) {
  const opts = getOpts();
  // Dynamically load the file
  const script = document.createElement('script');
  script.setAttribute('src', (prefix || '') + opts.filename);
  script.onload = onload;
  document.body.appendChild(script);
}

export function setOnStop(onStop: () => any): void {
  runtime.onStop = onStop;
}

export function getRTS() {
  if (rts === undefined) {
    throw new Error('runtime system not initialized');
  }
  return rts;
}
export function setBreakpoints(breaks: number[]): void {
  getRTS().setBreakpoints(breaks);
}

export function resumeScript() {
  runtime.resume();
}

export function stopScript() {
  runtime.stop();
}

export function stepScript() {
  runtime.step();
}
