const babel = require('babel-core');
const anf = require('../src/anf.js');

function transform(src) {
  const out = babel.transform(src, {
    plugins: [anf],
  });

  return out.code;
}

describe('literals', () => {
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
