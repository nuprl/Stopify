import { stopify, Stoppable } from '../src/stopifyInterface';
import { StopWrapper } from '../src/helpers';
import * as glob from 'glob'
import * as process from 'process';

const benchmarkFiles = glob.sync('benchmarks/should-run/*.js')

const benchmarkResponsiveness = function (stopifyFunc: stopify,
  code: string,
  yieldInterval: number,
  trails: number
  ): number[] {
    return [...Array(trails).keys()].map(function () {
      const sw: StopWrapper = new StopWrapper();
      let stoppable = stopifyFunc(code, sw.isStop, sw.onStop, sw.stop)
      stoppable.setInterval(yieldInterval);
      stoppable.run()

      let startTime = process.hrtime();
      try {
        stoppable.stop()
      } catch (e) {
        if (e === 'Execution stopped') {
          let diff = process.hrtime(startTime)
          return diff[0] * 1e9 + diff[1]
        } else {
          throw e;
        }
      }

    })
  }

const benchmarkRuntime = function (stopifyFunc: stopify,
  code: string,
  yieldInterval: number,
  trails: number): number[] {
    return [...Array(n).keys()].map(function () {
      const sw: StopWrapper = new StopWrapper();
      const stoppable = stopifyFunc(code, sw.isStop, sw.onStop, sw.stop)
      stoppable.setInterval(yieldInterval);
      const startTime = process.hrtime();
      stoppable.run();
      const diff = process.hrtime(startTime);
      return diff[0] * 1e9 + diff[1]
    })
  }

export {
  benchmarkResponsiveness,
  benchmarkRuntime,
  benchmarkFiles
}
