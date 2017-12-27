
import { Opts, Stoppable, ElapsedTimeEstimatorName } from '../types';
import * as minimist from 'minimist';
import { sum } from '../generic';
import { sprintf } from 'sprintf';
import { makeRTS, getRTS } from './rts';
import * as path from 'path';

const fakeRTS: any = {
  delimit(thunk: () => void) {
    thunk()
  },
  hitBreakpoint() {
    return false;
  }
}

export class Default {
  yields: number;
  mustStop: boolean;
  isStopped: boolean;

  constructor() {
    this.yields = 0;
    this.mustStop = false;
  }

  onStop: () => any;

  setOnStop(onStop: () => any): void {
    this.onStop = onStop;
  }

  resume(): void {
    this.mustStop = false;
    this.isStopped = false;
    this.step();
  }

  stop(): void {
    if (this.isStopped) {
      return;
    }
    this.mustStop = true;
    this.isStopped = true;
  }

  step(): void {
    const rts = getRTS();
    rts.resumeFromCaptured();
  }

  run(M: (() => void) | undefined, opts: Opts, done: () => void): void {
    const rts = opts.transform === 'original' ? fakeRTS : makeRTS(opts);
    let lastStopTime: number | undefined;
    let stopIntervals: number[] = [];
    this.mustStop = false;
    this.isStopped = false;

    rts.onYield = () => {
      this.yields++;
      if (opts.variance) {
        const now = Date.now();
        if (typeof lastStopTime === 'number') {
          stopIntervals.push(now - lastStopTime);
        }
        lastStopTime = now;
      }
      const hit = rts.hitBreakpoint();
      if (hit) {
        this.stop();
      }
      if (this.mustStop) {
        this.onStop();
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
      this.setOnStop(onDone)
      setTimeout(() => this.stop(), opts.stop * 1000);
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
