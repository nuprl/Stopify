const babel = require('babel-core');

// Make sure all transformers are included here.
function transform(src) {
  const desugarLoop = require('../src/desugarLoop.js');
  const desugarLabel = require('../src/desugarLabel.js');
  const verifier = require('../src/verifier.js');

  const out = babel.transform(src, {
    plugins: [desugarLabel, desugarLoop, verifier],
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
      `${original}\ncould not be transformed`
    : errorMessage

    return { message, pass };
  },
});

expect.extend({
  hasSameValue(org) {
    const te = eval(tr);
    const oe = eval(org);
    const pass = te === oe;

    const message = pass ?
      `original evals to ${oe} while transformed evals to ${te}`
    : 'transformed function retains the value';

    return { message, pass };
  },
});
