import * as babel from 'babel-core';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import {transform} from '../src/common/helpers';
import * as h from '../src/common/helpers'
const assert = require('assert');
const tmp = require('tmp');
const glob = require('glob');

const simpleTests = glob.sync('test/should-run/*.js', {})
const sourceLanguage = glob.sync('test/should-run/source-language/*.js', {})
export const stopTests = glob.sync('test/should-stop/*.js', {})

export const testFiles = simpleTests.concat(sourceLanguage)
export const skipped = glob.sync('test/should-run/skip/*.js')

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
    { timeout: 2000 }
  )

  assert.equal(runner.status, 0, `failed to stop ${srcFile} with ${transform}`)
}

export function stopifyTest(srcFile: string, transform: string) {
  const runner = spawnSync(
    './bin/stopify',
    ['-i', srcFile, '-t', transform, '-o', 'eval', '-y', '500']
  )

  assert.equal(runner.status, 0, (runner.stderr || "").toString());
}
