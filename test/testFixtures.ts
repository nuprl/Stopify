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

export function stopifyTest(srcFile: string, transform: string, interval: number) {
  const runner = spawnSync(
    './bin/stopify',
    ['-i', srcFile, '-t', transform, '-o', 'eval', '-y', interval]
  );
  assert.equal(runner.status, 0, (runner.stderr || "").toString());
}

export function callCCTest(srcPath: string, transform: string) {
  const testName = `${srcPath} (${transform})`;

  // Skip tests we know we can't handle
  if (path.basename(srcPath).indexOf("eval") === 0) {
    it.skip(testName);
    return;
  }

  it(testName, () => {
    const { name: dstPath } = tmp.fileSync({ dir: ".", postfix: ".js" });
    execSync(`./bin/compile --transform ${transform} ${srcPath} ${dstPath}`);
    try {
      execSync(`./bin/run ${dstPath} --yield 1`);
    }
    finally {
      // NOTE(arjun): I wouldn't mind if these were always left around.
      fs.unlinkSync(dstPath);
    }
  });
}

export function stopCallCCTest(srcPath: string, transform: string) {
  const testName = `${srcPath} (${transform}) (infinite loop)`;

  // Skip tests that we know we can't handle
  if (srcPath.indexOf("eval") >= 0) {
    it.skip(srcPath);
    return;
  }
  it(testName, () => {
    const { name: dstPath } = tmp.fileSync({ dir: ".", postfix: ".js" });
    execSync(`./bin/compile --transform ${transform} ${srcPath} ${dstPath}`);
    try {
      execSync(`./bin/run ${dstPath} --yield 10 --stop 1`, { timeout: 5000 });
    }
    finally {
      // NOTE(arjun): I wouldn't mind if these were always left around.
      fs.unlinkSync(dstPath);
    }
  });
}
