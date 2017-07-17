import * as f from './testFixtures.js';

// NOTE(rachit): Don't use arrow functions, otherwise timeout doesn't work.
describe('CPS stopping tests', function () {
  f.stopTests.forEach(function(filename: string) {
    it(filename, function () {
      f.stopProgramTest(filename, 'cps')
    })
  })
})

describe('Yield stopping tests', function () {
  f.stopTests.forEach(function(filename: string) {
    it(filename, function () {
      f.stopProgramTest(filename, 'yield');
    })
  })
})

describe('Call/CC stopping tests', function () {
  f.stopTests.forEach(function(filename: string) {
    it(filename, function () {
      f.stopProgramTest(filename, 'callcc');
    })
  })
})
