
import { Opts, Stoppable, ElapsedTimeEstimatorName } from '../types';
import * as minimist from 'minimist';
import { sum } from '../generic';
import { sprintf } from 'sprintf';
import { makeRTS, getRTS } from '../rts';
import * as path from 'path';

const fakeRTS = {
  onYield() {
  },
  delimit(thunk: () => void) {
    thunk()
  }
}

export class Default {
  yields: number;
  mustStop: boolean;

  constructor() {
    this.yields = 0;
    this.mustStop = false;
  }

  onYield: () => any;

  resume(): void {
    this.mustStop = false;
    const rts = getRTS();
    rts.onYield = this.onYield;
    this.step();
  }

  stop(onStop: () => any): void {
    this.mustStop = true;
    const rts = getRTS();
    const oldYield = rts.onYield;
    const onYield = () => {
      const pause = oldYield();
      onStop();
      return pause;
    };
    rts.onYield = onYield;
  }

  step(): void {
    const rts = getRTS();
    rts.resumeFromCaptured();
  }

  run(M: (() => void) | undefined, opts: Opts, done: () => void): void {
    const rts = opts.transform === 'original' ? fakeRTS : makeRTS(opts);
    let lastStopTime: number | undefined;
    let stopIntervals: number[] = [];

    this.onYield = rts.onYield = () => {
      this.yields++;
      if (opts.variance) {
        const now = Date.now();
        if (typeof lastStopTime === 'number') {
          stopIntervals.push(now - lastStopTime);
        }
        lastStopTime = now;
      }
      return !this.mustStop;
    }

    const onDone = () => {
      const endTime = Date.now();
      const runningTime = endTime - startTime;
      const latencyAvg = runningTime / this.yields;
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
              (latencyAvg - x) * (latencyAvg - x))) / this.yields);
        }
      }
      else {
        latencyVar = 'NA';
      }
      console.log(`${runningTime},${this.yields},${sprintf("%.2f", latencyAvg)},${latencyVar}`);
      done();
    }

    if (opts.env !== 'node') {
      const data = <HTMLTextAreaElement>document.getElementById('data')!;
      console.log = function (str: any) {
        data.value = data.value + str + '\n';
        const evt = new Event('change');
        data.dispatchEvent(evt);
      }
      window.onerror = (message: any) => {
        data.value = data.value + '\nAn error occurred:\n' + message + '\n';
        window.document.title = "done"
        const evt = new Event('change');
        data.dispatchEvent(evt);
      }
    }

    const startTime = Date.now();

    if (typeof opts.stop !== 'undefined') {
      setTimeout(() => this.stop(() => onDone()), opts.stop * 1000);
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
}

export default new Default();
