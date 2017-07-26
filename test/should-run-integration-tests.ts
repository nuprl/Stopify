import * as f from './testFixtures.js';

// NOTE(rachit): Don't use arrow functions, otherwise timeout doesn't work.
describe('CPS integration tests', function () {
  this.timeout(0)
  f.intTests.forEach(function(filename: string) {
    it.skip(filename, function () {
      f.stopifyTest(filename, 'cps')
    })
  })
})

describe('Yield integration tests', function () {
  this.timeout(0)
  f.intTests.forEach(function(filename: string) {
    it(filename, function () {
      f.stopifyTest(filename, 'yield');
    })
  })
})

describe('Call/CC integration tests', function () {
  this.timeout(0)
  f.intTests.forEach(function(filename: string) {
    it(`${filename} (call/cc)`, function () {
      f.stopifyTest(filename, 'callcc');
    })
  })
})
