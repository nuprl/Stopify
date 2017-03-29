// The basic idea here is that all computation is suspended and pushed into a
// "function_log" (a stack). When the runtime system starts running the
// computation, it yields control back everytime it computes a paused value.
var global_index = 0;

class PausedValue {
  // index is an identifier for the suspended function.
  constructor(index, fn, arg) {
    this.index = index;
    this.fn = fn;
    this.arg = arg;
  }
}

class Value {
  constructor(index, val) {
    this.index = index;
    this.val = val
  }
}

class Index {
  constructor(ind) {
    this.ind = ind;
  }
}

// Log of the computations that need to be done.
let function_log = [];

// All the values that have been computed.
let computed = [];

// call takes a function and argument and suspends their computation. It
// return an index wrapped in a PausedValue to identity the computation in the
// function_log.
// TODO(rachit): We can make the choice of yeilding control everytime we
// call a function. This is not an alternate to yielding control while the
// actual computation is happening.
// Returns an index pointing to the computed value.
function call(f, arg) {
  const index = new Index(++global_index);
  const pv = new PausedValue(index, f, arg);
  function_log.push(pv);
  return index;
}

// This runs a computation. Note that this function recursively computes
// values. Note that (eventually) we would have to deal with the function also
// being a PausedValue.
// TODO(rachit): To yield control during runtime, we can have a global
// pause value that stops and resumes computation.
function run(f, arg) {
  if (arg instanceof Index) {
    let val;
    if((val = computed.find(x => x.index.ind === arg.ind)) !== undefined) {
      return f(val);
    }
    else {
      // Before computing a paused value, yield the control.
      yield_control();
      const indexedVal = function_log.find(x => x.index.ind === arg.ind);
      function_log = function_log.filter(x => x.index.ind !== arg.ind);
      const res = run(indexedVal.fn, indexedVal.arg);

      // After computing the value, push it into the computed array.
      computed.push(new Value(arg.index, res));
      return f(res);
    }
  }
  else {
    return f(arg);
  }
}

function yield_control() {
  console.log("yeilding control...");
}

// Starts the top-level suspended computation.
function run_rec() {
  while(function_log.length !== 0) {
    console.log(`Length of function_log is ${function_log.length}`);
    console.log(computed);
    console.log(function_log);
    console.log('--------')
    const pv = function_log.shift();
    const res = run(pv.fn, pv.arg);
    computed.push(new Value(pv.index, res))
  }
}

function inc(a) {
  return a+1;
}

function times(a) {
  return a*10;
}

function div(a) {
  return a/2;
}


let a = 2;

let t1 = call(div, a);
let t2 = call(times, t1);
let res = call(inc, t2);

console.log(computed);
console.log(function_log);
run_rec();
