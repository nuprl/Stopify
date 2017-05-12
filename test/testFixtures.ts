const assert = require('assert');
import * as babel from 'babel-core';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { spawnSync } from 'child_process';
import * as tmp from 'tmp';
import {transform} from '../src/helpers';

export const testFiles = glob.sync('test/should-run/*.js', {})

export function transformTest(original: string, plugs: any[][]): string {
  let errorMessage = '';
  let transformed = '';

  try {
    transformed = transform(original, plugs);
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

export function stopifyTest(srcFile: string, transform: string) {
  const runner = spawnSync(
    './built/stopify.js',
    ['-i', srcFile, '-t', transform, '-o', 'eval', '--notime'],
    { timeout: 1000 }
  )

  assert.equal(runner.status, 0, (runner.stderr || "").toString());
}
