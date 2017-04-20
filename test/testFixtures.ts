const assert = require('assert');
import * as babel from 'babel-core';
const fs = require('fs');
const path = require('path');

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
const noArrows = require('babel-plugin-transform-es2015-arrow-functions');
module.exports = { transformTest, retainValueTest, walkSync };

// Make sure all transformers are included here.
const defaults = [
  [noArrows, desugarLoop, desugarLabel, desugarAndOr],
  [anf, addKArg],
  [cps, verifier],
  [kApply]
];

function transform(src, plugs) {
  let { code, ast } = babel.transform(src, { babelrc: false });
  plugs.forEach(trs => {
      const res = babel.transformFromAst(ast, code, {
        plugins: [...trs],
        babelrc: false,
      });
      code = res.code;
      ast = res.ast;
  });

  return code;
}

export function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {

    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));

  });
  return filelist;
}

export function transformTest(original) {
  let errorMessage = '';
  let transformed = '';

  try {
    transformed = transform(original, defaults);
  } catch (e) {
    errorMessage = e.message;
  }

  const pass = errorMessage.length === 0;
  assert(pass, `Failed to transform: ${errorMessage.substr(0, 200)}`);

  return transformed;
}

export function retainValueTest(org) {
  let te, oe, pass;
  try {
    te = eval(transformTest(org));
  } catch(e) {
    assert(false, `Failed to eval transformed code: ${e.message}`)
  }

  oe = eval(org);
  pass = te === oe;
  assert(pass,
    `Failed: original evals to '${oe}' while transformed evals to '${te}'`);
}
