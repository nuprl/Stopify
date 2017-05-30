#!/usr/bin/env node
const spawnSync = require('child_process').spawnSync;
const fs = require('fs');
const path = require('path');
const transform = require('../built/src/helpers').transform
const assert = require('assert');

const cwd = process.cwd();
const benchDir = path.join(cwd, 'benchmark-results')
const header = "Transform,Yield Interval,Time\n"
const intervals =
  [ 1, 10, 25, 50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500, ]
const trials = 1000

if(fs.existsSync(benchDir) === false) {
  fs.mkdirSync(benchDir)
}

function runTrial(code, logFile, transform, interval) {
  const prog =
    `function __program() {
       for(let $i = 0; i < ${trials}; i++) {
         ${code}
       };
     }
     __program();`
  console.log(prog)

  let time;
  if (transform !== 'baseline') {
    const runner = spawnSync(
      '../built/stopify.js',
      ['-s', prog, '-t', transform, '-o', 'benchmark', '-y', interval]
    )

    assert.equal(runner.status, 0, (runner.stderr || "").toString());
    time = runner.stdout.toString().slice(0,5)
  } else {
    const runner = spawnSync(
      '/usr/bin/time',
      ['--format', "'%E'", 'node', '-e', prog]
    )

    // Hard code things for output from /usr/bin/time.
    assert.equal(runner.status, 0, (runner.stderr || "").toString());
    time = runner.stderr.toString().split(':')[1]
  }

  fs.appendFileSync(logFile, `${transform},${interval},${time}\n`)
}

function stopifyBenchmark(srcFile) {
  if(fs.existsSync(srcFile) === false) {
    console.log(`${srcFile} not found, skipping...`)
  }
  const logFile = path.join(benchDir, srcFile.split('/').pop() + "-benchmark.csv")
  fs.writeFileSync(logFile, header)

  const code = fs.readFileSync(srcFile).toString()
  console.log(`Running ${srcFile.split('/').pop()}`)

  intervals.forEach(interval => {
    runTrial(code, logFile, 'baseline', interval)
    runTrial(code, logFile, 'yield', interval)
    runTrial(code, logFile, 'cps', interval)
  })
}

const args = process.argv.slice(2)

if (args.length < 1) {
  console.log("No files provided")
  console.log("Usage: benchmarkFixture <file 1> <file 2> ...")
}

args.forEach(file => stopifyBenchmark(file))
