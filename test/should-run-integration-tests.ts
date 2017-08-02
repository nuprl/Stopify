import * as f from './testFixtures.js';

// NOTE(rachit): Don't use arrow functions, otherwise timeout doesn't work.
describe('CPS integration tests', function () {
  this.timeout(0)
  f.intTests.forEach(function(filename: string) {
    it.skip(filename, function () {
      f.stopifyTest(filename, 'cps', 500)
    })
  })
})

describe('Yield integration tests', function () {
  this.timeout(0)
  f.intTests.forEach(function(filename: string) {
    it(filename, function () {
      f.stopifyTest(filename, 'yield', 500);
    })
  })
})

describe('Call/CC integration tests', function () {
  this.timeout(0)
  f.intTests.forEach(function(filename: string) {
    it(`${filename} (call/cc)`, function () {
      f.stopifyTest(filename, 'eager', 1);
      f.stopifyTest(filename, 'lazy', 1);
      f.stopifyTest(filename, 'retval', 1);
    })
  })
})
