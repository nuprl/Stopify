import * as f from './testFixtures.js';
import * as path from 'path';
import * as fs from  'fs';
import * as file from 'file';

// Desugar Transforms
import * as noArrows from 'babel-plugin-transform-es2015-arrow-functions';
import * as desugarLoop from '../src/desugarLoop';
import * as desugarLabel from '../src/desugarLabel';
import * as desugarAndOr from '../src/desugarAndOr';
import * as desugarWhileToFunc from '../src/desugarLoopToFunc';

import * as noEvalVerifier from '../src/verifiers/noEvalVerifier';
import * as desugarVerifier from '../src/verifiers/desugarVerifier';

const desugarPlugs: any[][] = [
  [noEvalVerifier, noArrows, desugarLoop, desugarLabel],
  [desugarAndOr, desugarVerifier]
];

// NOTE(rachit): Don't use arrow functions, otherwise timeout doesn't work.
describe('Desugaring tests', function () {
  f.testFiles.forEach(function(filename) {
    const prog = fs.readFileSync(filename, 'utf-8').toString();
    it(filename, function () {
      f.retainValueTest(prog, desugarPlugs)
    })
  })
})

