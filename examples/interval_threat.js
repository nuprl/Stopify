const args = require('minimist')(process.argv.slice(1));

const INTERVAL = args.interval || 2;
var counter = INTERVAL;
console.log("Yield interval", INTERVAL);

const start = Date.now();
function mean(arr) {
  if (arr.length === 0) { return 0; }
  return arr.reduce((x,y) => x + y) / arr.length;
}

function variance(array) {
		var m = mean(array);
		return mean(array.map(function(num) {
			return Math.pow(num - m, 2);
		}));
}
	
function f(N) {
  // exactly the same ...
  var r = 0;
  for (var i = 0; i < N; i++) { r = (r + i) % 2003; }
  return r;
}

function* main() {
  const BOUND = 20;
  for (var j = 1; j < BOUND; j++) {
    if (--counter === 0) {
      yield 0;
    };
    const iters = Math.min(500, Math.pow(2, (BOUND - j)) - 1);
    for (var k = 1; k < iters; k++) {
      if (--counter === 0) {  
        yield 0;
      }
    }
    f(Math.pow(3, j));

  }
}

var lastYield;
var allYields = [];

function driver(gen, onDone) {
  counter = INTERVAL;
  var v = gen.next();
  allYields.push(Date.now() - lastYield);

  if (v.done) {
    return onDone();
  }
  
  const now = Date.now();
  allYields.push(now - lastYield);
  // console.log("Pausing. Ran for", now - lastYield, "milliseconds");
  lastYield = now;
  return setTimeout(() => driver(gen, onDone), 0);
}


lastYield = Date.now();
var g = main();
driver(g, () => {
  console.log("Mean computation time", mean(allYields));
  console.log("Variance", variance(allYields));
  console.log("Total runtime", Date.now() - start);
});
