const babel = require('babel-core');

// Make sure all transformers are included here.
function transform(prog) {
  const noArrows = require('babel-plugin-transform-es2015-arrow-functions')
  const desugarLoop = require('../src/desugarLoop.js');
  const desugarLabel = require('../src/desugarLabel.js');
  const desugarAndOr = require('../src/desugarAndOr.js');
  const anf = require('../src/anf.js');
  const cps = require('../src/callccPass1.js');
  const verifier = require('../src/verifier.js');

  const out = babel.transform(prog, {
    plugins: [
      noArrows, desugarLoop, desugarLabel, desugarAndOr, anf, cps, verifier],
    babelrc: false,
  });

  return out.code;
}

expect.extend({
  transformsSuccessfully(original) {
    let errorMessage = '';
    let transformed = '';

    try {
      transformed = transform(original);
    } catch (e) {
      errorMessage = e.message;
    }

    const pass = errorMessage.length === 0;
    const message = pass ?
      `Transformed successfully`
    : errorMessage;

    return { message, pass };
  },
});

expect.extend({
  hasSameValue(org) {
    const te = eval(tr);
    const oe = eval(org);
    const pass = te === oe;

    const message = pass ?
      'transformed function retains the value'
      : `original evals to ${oe} while transformed evals to ${te}`

    return { message, pass };
  },
});
