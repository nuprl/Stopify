import * as babel from 'babel-core';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync, execSync } from 'child_process';
import {transform} from '../src/common/helpers';
import * as h from '../src/common/helpers'
const assert = require('assert');
import * as tmp from 'tmp';
const glob = require('glob');

export const unitTests = glob.sync('test/should-run/*.js', {})
export const intTests = glob.sync('test/should-run/source-language/*.js', {})
export const stopTests = glob.sync('test/should-stop/*.js', {})

const opts = {
  debug: false, optimize: false, tail_calls: false, no_eval: false
}

export function transformTest(original: string, plugs: any[][]): string {
  let errorMessage = '';
  let transformed = '';

  try {
    transformed = transform(original, plugs, opts).code;
  } catch (e) {
    errorMessage = e.message;
  }

  const pass = errorMessage.length === 0;
  assert(pass, `Failed to transform: ${errorMessage.substr(0, 200)}`);

  return transformed;
}

export function retainValueTest(org: string, plugs: any[][]) {
  let te, oe, pass;
  try {
    te = eval(transformTest(org, plugs));
  } catch(e) {
    assert(false, `Failed to eval transformed code: ${e.message}`)
  }

  assert(true,
    `Failed: original evals to '${oe}' while transformed evals to '${te}'`);
}

export function stopProgramTest(srcFile: string, transform: string) {
  const runner = spawnSync(
    './bin/stopify',
    ['-i', srcFile, '-t', transform, '-o', 'stop', '-y', '10'],
    { timeout: 5000 }
  )

  assert.equal(runner.status, 0, `failed to stop ${srcFile} with ${transform}`)
}

function runStopifyCallCC(srcFile: string, interval?: number) {
  const tmpJs = tmp.fileSync({ dir: ".", postfix: ".js" });
  try {
    const out = fs.createWriteStream(tmpJs.name, { fd: tmpJs.fd });
    
    assert.equal(
      spawnSync(
        "node", ["./built/src/callcc/toModule", srcFile],
        { stdio: [ 'ignore', out, process.stderr ] }).status,
      0,
      "compile failed");

      out.close();

    const runArgs = ['./built/src/runStopify', tmpJs.name];
    if (typeof interval === 'number') {
      runArgs.push('-y');
      runArgs.push(String(interval));
    }
    assert.equal(
      spawnSync(
        'node', runArgs, { stdio: [ 'ignore', 'ignore', 'inherit' ] }).status,
      0,
      "run failed");
  }
  finally {
    tmpJs.removeCallback();
  }
}

export function stopifyTest(srcFile: string, transform: string, interval: number) {
  if (transform === 'callcc') {
    return runStopifyCallCC(srcFile, interval);
  }

  const runner = spawnSync(
    './bin/stopify',
    ['-i', srcFile, '-t', transform, '-o', 'eval', '-y', interval]
  );
  assert.equal(runner.status, 0, (runner.stderr || "").toString());
}
