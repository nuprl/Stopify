import { sum } from '../generic';
import { sprintf } from 'sprintf';

declare var stopify: any;

const data = <HTMLTextAreaElement>document.getElementById('data')!;
const startTime = Date.now();
let lastYieldTime: number | undefined;
let yieldIntervals: number[] = [];
let yields = 0;

console.log = function (str: any) {
  data.value = data.value + str + '\n';
  const evt = new Event('change');
  data.dispatchEvent(evt);
};

window.onerror = (message, url, line, col, error) => {
  console.log('An error occurred');
  console.log(message);
  if (error && error.stack) {
    console.log(error.stack);
  }
  window.document.title = "done";
};

const opts = stopify.parseRuntimeOpts(
  JSON.parse(decodeURIComponent(window.location.hash.slice(1))));

const handle = stopify.stopify(opts.filename, opts);

function onDone() {
  const endTime = Date.now();
  const runningTime = endTime - startTime;
  const latencyAvg = runningTime / yields;
  let latencyVar;
  console.log("BEGIN STOPIFY BENCHMARK RESULTS");
  if (opts.variance) {
    console.log("BEGIN VARIANCE");
    for (let i = 0; i < yieldIntervals.length; i++) {
      console.log(`${i},${yieldIntervals[i]}`);
    }
    console.log("END VARIANCE");
    if (yields === 0) {
      latencyVar = "0";
    }
    else {
      latencyVar = sprintf("%.2f",
        sum(yieldIntervals.map(x =>
          (latencyAvg - x) * (latencyAvg - x))) / yields);
    }
  }
  else {
    latencyVar = 'NA';
  }
  console.log(
    `${runningTime},${yields},${sprintf("%.2f", latencyAvg)},${latencyVar}`);
  console.log('OK.');
  window.document.title = 'done';
}

// Function used by `-t original` to signal the completion of a run.
function originalOnDone() {
  const runningTime = Date.now() - startTime;
  console.log("BEGIN STOPIFY BENCHMARK RESULTS");
  console.log(`${runningTime},0,Infinity,NA`);
  console.log('OK.');
  window.document.title = 'done';
}

(<any>window).originalOnDone = originalOnDone;

handle.run(onDone, () => {
  yields++;
  if (opts.variance) {
    const now = Date.now();
    if (typeof lastYieldTime === 'number') {
      yieldIntervals.push(now - lastYieldTime);
    }
    lastYieldTime = now;
  }
});

if (typeof opts.stop !== 'undefined') {
  window.setTimeout(() => handle.pause(onDone), opts.stop * 1000);
}
