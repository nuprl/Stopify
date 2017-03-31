const assert = require('assert')
const babel = require('babel-core');

// All the plugins
const noArrows = require("babel-plugin-transform-es2015-arrow-functions")
const desugarLoop = require('../src/desugarLoop.js');
const desugarLabel = require('../src/desugarLabel.js');
const desugarAndOr = require('../src/desugarAndOr.js');
const anf = require('../src/anf.js');
const cps = require('../src/callccPass1.js');
const verifier = require('../src/verifier.js');

module.exports = { transformTest, retainValueTest }

// Make sure all transformers are included here.
function transform(src) {
  const out = babel.transform(src, {
    plugins: [
      noArrows, desugarLoop, desugarLabel, desugarAndOr, anf, cps, verifier],
    babelrc: false,
  });

  return out.code;
}

function transformTest(original) {
  let errorMessage = '';
  let transformed = '';

  try {
    transformed = transform(original);
  } catch (e) {
    errorMessage = e.message;
  }

  const pass = errorMessage.length === 0;
  assert(pass, `Failed to transform: ${errorMessage}`);

  return transformed
}

function retainValueTest(org) {
  const te = eval(transformTest(org))
  const oe = eval(org);
  const pass = te === oe;

  assert(pass, `original evals to ${oe} while transformed evals to ${te}`);
}
