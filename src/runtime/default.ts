
import { Opts, Stoppable, ElapsedTimeEstimatorName } from '../types';
import * as minimist from 'minimist';
import { sum } from '../generic';
import { sprintf } from 'sprintf';
import { makeRTS } from '../rts';
import * as path from 'path';

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
