import * as f from './testFixtures';
import * as path from 'path';
import * as fs from  'fs';
const file = require('file');

// Yield transform.
 import * as yieldPass from '../src/yield';

// Call Expression naming transform.
import * as anf from '../src/anf';

// Desugar Transforms
const noArrows = require('babel-plugin-transform-es2015-arrow-functions');
import * as desugarAndOr from '../src/desugarAndOr';
import * as noEvalVerifier from '../src/verifiers/noEvalVerifier';

const plugs = [ [noEvalVerifier, noArrows, desugarAndOr], [anf], [yieldPass] ]

// NOTE(rachit): Don't use arrow functions, otherwise timeout doesn't work.
describe('Yield transformation tests', function () {
  f.testFiles.forEach(function(filename: string) {
    it(filename, function () {
      f.stopifyTest(filename, 'yield');
    })
  })
})
