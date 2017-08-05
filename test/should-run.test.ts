import * as f from './testFixtures.js';
import * as path from 'path';

// NOTE(rachit): Don't use arrow functions, otherwise timeout doesn't work.
describe('CPS transform tests', function () {
  
  const cpsSkip = [
    'test/should-run/hoisted-call.js',
    'test/should-run/function-decl-hoist.js',
  ];
  f.unitTests.forEach(function(filename: string) {
    if (cpsSkip.includes(filename)) {
      it.skip(filename);
      return;
    }
    if (path.basename(filename).indexOf("eval") === 0) {
      it.skip(filename);
      return;
    }
    it(filename, function () {
      f.stopifyTest(filename, 'cps', 500)
    })
  })
})

describe('Yield transformation tests', function () {

  f.unitTests.forEach(function(filename: string) {
    it(`${filename} (yield)`, function () {
      f.stopifyTest(filename, 'yield', 500);
    })
  })
})

describe('call/cc', function() {
  f.unitTests.forEach(function(filename: string) {
    f.callCCTest(filename, "lazy");
    f.callCCTest(filename, "eager");
    f.callCCTest(filename, "retval");
  });  
});
