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

// Call Expression naming transform.
import * as anf from '../src/anf';

// CPS transforms.
import * as addKArg from '../src/addContinuationArg';
import * as cps from '../src/cpsVisitor';
import * as kApply from '../src/applyContinuation';
import * as applyStop from '../src/stoppableApply';

// Verification transform.
import * as cpsVerifier from '../src/verifiers/cpsVerifier';
import * as desugarVerifier from '../src/verifiers/desugarVerifier';
import * as noEvalVerifier from '../src/verifiers/noEvalVerifier';


const desugarPlugs: any[][] = [
  [noEvalVerifier, noArrows, desugarLoop, desugarLabel],
  [desugarWhileToFunc, desugarAndOr, desugarVerifier]
];

const cpsPlugs: any[][] = [
  ...desugarPlugs, [anf, addKArg], [cps], [kApply],
  [desugarVerifier]
]

// NOTE(rachit): Don't use arrow functions, otherwise timeout doesn't work.
describe('CPS transform tests', function () {
  f.testFiles.forEach(function(filename) {
    const prog = fs.readFileSync(filename, 'utf-8').toString();
    it(filename, function () {
      f.stopifyTest(filename, 'cps')
    })
  })
})
