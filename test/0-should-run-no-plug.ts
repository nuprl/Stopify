import * as f from './testFixtures.js';
import * as path from 'path';
import * as fs from  'fs';
const file = require('file');

import * as noEvalVerifier from '../src/verifiers/noEvalVerifier';

// NOTE(rachit): Don't use arrow functions, otherwise timeout doesn't work.
describe('Sanity check -- All tests pass without plugins', function () {
  this.timeout(0)
  f.testFiles.forEach(function(filename: string) {
    const prog = fs.readFileSync(filename, 'utf-8').toString();
    it(filename, function () {
      f.retainValueTest(prog, [ [noEvalVerifier] ])
    })
  })
  f.skipped.forEach((f: string) => {
    it.skip(f, () => {})
  })
})

