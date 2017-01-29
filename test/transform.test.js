const babel = require('babel-core');
const anf = require('../src/anf.js');

function transform(src) {
  const out = babel.transform(src, {
    plugins: [anf],
  });

  return out.code;
}

/**
 * Use to test that the transformed program and the original evaluated
 * to the same value. Returns the transformed program in the message
 * on failure
 */
expect.extend({
  toHaveSameResult(original) {
    const transformed = transform(original);
    const oeval = eval(original);
    let teval;
    let error = "";
    try {
      teval = eval(transformed);
    } catch (e) {
      error = e.message;
    }

    const pass = teval === oeval;

    const message = error.length > 0 ?
      () => `${transformed}\ncould be evaluated.\nError: ${error}`
    : () => `${teval} did ${pass ? '' : 'not'} equal ${oeval}.\nTransformation: ${transformed}`;

    return {message, pass};
  }
});

describe('complex binary expression', () => {
  const tests = [
    "1 + 2 + 3;",
    "true && false && true",
    "(1 + 2) - (3 + 4);",
    "1 - (2 + 3);"
  ];

  tests.forEach((test) => {
    describe(`${test}`, () => {
      it('is transformed', () => {
        expect(test).not.toBe(transform(test));
      })

      it('retains evald value', () => {
        expect(test).toHaveSameResult();
      })
    })
  });

});
