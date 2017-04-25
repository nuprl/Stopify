import { stopify, Stoppable } from '../src/stopifyInterface';
import * as process from 'process';

// Object to wrap the state of the stop, onStop, isStop functions
class StopWrapper {
  private hasStopped: boolean;
  constructor() {
    this.hasStopped = false;
  }
  onStop() {
    throw 'Execution stopped'
  }
  stop() {
   this.hasStopped = true;
  }
  isStop() {
    return this.hasStopped === true;
  }
}

const benchmarkResponsiveness = function (stopifyFunc: stopify,
  code: string,
  lowerBound: number = 1,
  upperBound: number = 100,
  step: number = 10): number[][] {
    const res: number[][] = []
    let stoppable: Stoppable;

    let startTime;
    for(let i = lowerBound; i < upperBound; i += step) {
      const sw: StopWrapper = new StopWrapper();
      stoppable = stopifyFunc(code, sw.isStop, sw.onStop, sw.stop)
      stoppable.setInterval(i);
      stoppable.run()

      try {
        startTime = process.hrtime();
        stoppable.stop()
      } catch (e) {
        if (e === 'Execution stopped') {
          let diff = process.hrtime(startTime)
          let totalTime = diff[0] * 1e9 + diff[1]
          res.push([i, totalTime])
        } else {
          throw e;
        }
      }

    }

    return res;
  }

const benchmarkRuntime = function (stopifyFunc: stopify,
  code: string,
  trails: number): number[] {
    return [...Array(n).keys()].map(function () {
      const sw: StopWrapper = new StopWrapper();
      const stoppable = stopifyFunc(code, sw.isStop, sw.onStop, sw.stop)
      const startTime = process.hrtime();
      stoppable.run();
      const diff = process.hrtime(startTime);
      return diff[0] * 1e9 + diff[1]
    })
  }

export {
  benchmarkResponsiveness,
  benchmarkRuntime
}
