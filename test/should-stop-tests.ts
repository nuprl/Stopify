import * as f from './testFixtures.js';

// NOTE(rachit): Don't use arrow functions, otherwise timeout doesn't work.
describe('CPS stopping tests', function () {
  this.timeout(5000);
  f.stopTests.forEach(function(filename: string) {
    if (filename.indexOf("eval") >= 0) {
      it.skip(filename);
      return;
    }
    it(filename, function () {
      f.stopProgramTest(filename, 'cps')
    })
  })
})

describe('Yield stopping tests', function () {
  this.timeout(5000);
  f.stopTests.forEach(function(filename: string) {
    it(filename, function () {
      f.stopProgramTest(filename, 'yield');
    })
  })
})

describe('Call/CC stopping tests', function () {
  this.timeout(5000);
  f.stopTests.forEach((filename: string) => {
    f.stopCallCCTest(filename, 'lazy');
    f.stopCallCCTest(filename, 'eager');
    f.stopCallCCTest(filename, 'retval');
  });
});
