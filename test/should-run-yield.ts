import * as f from './testFixtures.js';
import * as path from 'path';
import * as fs from  'fs';
import * as file from 'file';

// Yield transform.
 import * as yieldPass from '../src/yield';

// Call Expression naming transform.
import * as anf from '../src/anf';

// Desugar Transforms
import * as noArrows from 'babel-plugin-transform-es2015-arrow-functions';
import * as desugarAndOr from '../src/desugarAndOr';
import * as noEvalVerifier from '../src/verifiers/noEvalVerifier';

const plugs = [ [noEvalVerifier, noArrows, desugarAndOr], [anf], [yieldPass] ]

// NOTE(rachit): Don't use arrow functions, otherwise timeout doesn't work.
describe('Yield transformation tests', function () {
  f.testFiles.forEach(function(filename) {
    it(filename, function () {
      f.stopifyTest(filename, 'yield');
    })
  })
})
