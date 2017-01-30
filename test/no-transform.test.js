const babel = require('babel-core');
const anf = require('../src/anf.js');

function transform(src) {
  const out = babel.transform(src, {
    plugins: [anf],
  });

  return out.code;
}

describe('Literal', () => {
  const tests = [
  { name: 'strings', prog: '"string";' },
  { name: 'numbers', prog: '1;' },
  { name: 'booleans', prog: 'true;' },
  ];

  tests.forEach((test) => {
    it(`${test.name} are not transformed`, () => {
      expect(test.prog).toBe(transform(test.prog));
    });
  });
});

describe('Simple function call', () => {
  const tests = [
    'f();',
    'f(x);',
    'f(x, y, z);',
    'f(1, 2, 3);',
  ];

  tests.forEach((test) => {
    it(`${test} is not transformed`, () => {
      expect(test).toBe(transform(test));
    });
  });
});
