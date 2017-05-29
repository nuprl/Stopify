#!/usr/bin/env node
import * as babel from 'babel-core';
import * as fs from 'fs';
import * as path from 'path';
import { transform } from '../src/helpers';
import { spawnSync } from 'child_process';
const glob = require('glob');
const tmp = require('tmp');
const assert = require('assert');

const cwd = process.cwd();
const benchDir = path.join(cwd, 'benchmark-results')
const header = "Transform,Yield Interval,1,2,3,4,5,Mean"
const intervals =
  [ 1, 10, 25, 50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500, ]
const trials = 5;

if(fs.existsSync(benchDir) === false) {
  fs.mkdirSync(benchDir)
}

function runTrials(
  srcFile: string, logFile: string, transform: string, interval: number) {
    const time = []
    for(let j = 0; j < trials; j++) {
      const runner = spawnSync(
        './built/stopify.js',
        ['-i', srcFile, '-t', transform, '-o', 'benchmark', '-y', interval]
      )

      assert.equal(runner.status, 0, (runner.stderr || "").toString());

      time.push(Number(runner.stdout.toString()))
    }
    time.push(time.reduce((x, y) => x + y)/trials)
    fs.appendFileSync(logFile, `${transform},${interval}` + time.toString())
}

function stopifyBenchmark(srcFile: string) {
  if(fs.existsSync(srcFile) === false) {
    console.log(`${srcFile} not found, skipping...`)
  }
  const logFile = path.join(benchDir, srcFile + "-benchmark.csv")
  fs.writeFileSync(logFile, header)

  intervals.forEach(interval => {
    runTrials(srcFile, logFile, 'yield', interval)
    runTrials(srcFile, logFile, 'cps', interval)
  })
}
