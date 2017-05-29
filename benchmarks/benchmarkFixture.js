#!/usr/bin/env node
const babel = require('babel-core');
const spawnSync = require('child_process').spawnSync;
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const tmp = require('tmp');
const assert = require('assert');
const transform = require('../built/src/helpers').transform

const cwd = process.cwd();
const benchDir = path.join(cwd, 'benchmark-results')
const header = "Transform,Yield Interval,1,2,3,4,5,Mean\n"
const intervals =
  [ 1, 10, 25, 50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500, ]
const trials = 5;

if(fs.existsSync(benchDir) === false) {
  fs.mkdirSync(benchDir)
}

function runTrials(srcFile, logFile, transform, interval) {
  const time = []
  process.stdout.write(`${srcFile.split('/').pop()}, ${transform}:`)

  for(let j = 0; j < trials; j++) {
    const runner = spawnSync(
      '../built/stopify.js',
      ['-i', srcFile, '-t', transform, '-o', 'benchmark', '-y', interval]
    )

    assert.equal(runner.status, 0, (runner.stderr || "").toString());

    process.stdout.write(`...${j+1}`)
    time.push(Number(runner.stdout.toString()))
  }

  time.push(time.reduce((x, y) => x + y)/trials)
  fs.appendFileSync(logFile, `${transform},${interval},` + time.map(x => x.toString().slice(0,5)).toString() + '\n')
  process.stdout.write('\n')
}

function stopifyBenchmark(srcFile) {
  if(fs.existsSync(srcFile) === false) {
    console.log(`${srcFile} not found, skipping...`)
  }
  const logFile = path.join(benchDir, srcFile.split('/').pop() + "-benchmark.csv")
  fs.writeFileSync(logFile, header)

  intervals.forEach(interval => {
    runTrials(srcFile, logFile, 'yield', interval)
    runTrials(srcFile, logFile, 'cps', interval)
  })
}

const args = process.argv.slice(2)

if (args.length < 1) {
  console.log("No files provided")
  console.log("Usage: benchmarkFixture <file 1> <file 2> ...")
}

args.forEach(file => stopifyBenchmark(file))
