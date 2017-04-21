import * as assert from 'assert';
import * as babel from 'babel-core';
import * as fs from 'fs';
import * as path from 'path';

// All the plugins
import * as desugarLoop from '../src/desugarLoop';
import * as desugarLabel from '../src/desugarLabel';
import * as desugarAndOr from '../src/desugarAndOr';

// Call Expression naming transform.
import * as anf from '../src/anf';

// CPS transforms.
import * as addKArg from '../src/addContinuationArg';
import * as cps from '../src/cpsVisitor';
import * as kApply from '../src/applyContinuation';
import * as applyStop from '../src/stoppableApply';

// Yield transform.
import * as yieldPass from '../src/yield';
//const yieldPass = require('./src/yield');

// Verification transform.
import * as verifier from '../src/verifier';
import * as noArrows from 'babel-plugin-transform-es2015-arrow-functions';

// Helpers
import {transform} from '../src/helpers';

// Make sure all transformers are included here.
const desugarPlugs: any[][] = [
  [noArrows, desugarLoop, desugarLabel, desugarAndOr]
];

const yieldPlugs: any[][] = [ [anf, yieldPass] ]

const cpsPlugs: any[][] = [ ...desugarPlugs, [anf, addKArg], [cps], [kApply] ]

const plugMap = {
  'desugar': desugarPlugs,
  'yieldPass': yieldPlugs,
  'cps': cpsPlugs,
  'default': []
}

type plugType = 'desugar' | 'yieldPass' | 'cps' | 'default'

export function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {

    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));

  });
  return filelist;
}

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

export function retainValueTest(org: string, plugs: plugType) {
  let te, oe, pass;
  try {
    te = eval(transformTest(org, plugMap[plugs]));
  } catch(e) {
    assert(false, `Failed to eval transformed code: ${e.message}`)
  }

  assert(true,
    `Failed: original evals to '${oe}' while transformed evals to '${te}'`);
}

module.exports = {
    transformTest,
    retainValueTest,
    walkSync
};
