const babel = require('babel-core');
const anf = require('../src/anf.js');

function transform(src) {
  const out = babel.transform(src, {
    plugins: [anf],
  });

  return out.code;
}

/**
 * To check that the program can be successfully transformed.
 */
expect.extend({
  transformsSuccessfully(original) {
    let error = '';
    let transformed = '';

    try {
      transformed = transform(original);
    } catch (e) {
      error = e.message;
    }

    const pass = error.length === 0;
    const message = pass ?
      `${original}\ncould not be transformed`
    : `${original}\ntransformed to\n${transformed}`;

    return { message, pass };
  },
});

expect.extend({
  hasSameValue(org, tr, before = '') {
    const te = eval(before + tr);
    const oe = eval(before + org);
    const pass = te === oe;

    const message = pass ?
      `original evals to ${oe} while transformed evals to ${te}`
    : 'transformed function retains the value';

    return { message, pass };
  },
});


function transformedTestFixture(tests, before = '') {
  tests.forEach((test) => {
    describe(`${test}`, () => {
      it('can be transformed', () => {
        expect(test).transformsSuccessfully();
      });

      it('was transformed', () => {
        expect(test).not.toBe(transform(test));
      })

      it('retains value', () => {
        expect(test).hasSameValue(transform(test), before);
      });
    });
  });
}

describe('complex binary expression', () => {
  const tests = [
    '1 - 2 - 3;',
    '1 - 2 - 3 - 4;',
    '1 - 2 - 3 - 4 - 5;',
    'true && false && true',
    '(1 + 2) - (3 + 4);',
    '1 - (2 + 3);',
  ];

  transformedTestFixture(tests);
});

describe('function call expressions with non atomic arguments', () => {
  const tests = [
    'f(1 + 2);',
    'f(1 + 2 + 3);',
    'f(1 + 2, 3 + 4);',
    'f(f(1, 2), f(3, 4));',
    'f(f(1 + 2, 3 + 4), f(1 ,2));',
    'f(1 + 2, 3 + 4 + 5, 6 + 7 + 8);',
  ];

  const before = 'function f(i, ...arr) { arr.push(i); return arr.reduce((x, y) => x * y) };';

  transformedTestFixture(tests, before);
});

describe('let expressions', () => {
  const tests = [
    'let x = 1 + 2 + 3; x;',
    'let x = f(1 + 2); x;',
    'let x = 1 + f(3 + 4); x;',
    'let x = 1 + 2 + f(f(1 + 2), f(4 + 5)); x;'
  ]

  const before = 'function f(i, ...arr) { arr.push(i); return arr.reduce((x, y) => x * y) };';

  transformedTestFixture(tests, before);
});
