import * as f from './testFixtures.js';

// NOTE(rachit): Don't use arrow functions, otherwise timeout doesn't work.
describe('CPS stopping tests', function () {
  this.timeout(5000)
  f.stopTests.forEach(function(filename: string) {
    it(filename, function () {
      f.stopProgramTest(filename, 'cps')
    })
  })
})

describe('Regen stopping tests', function () {
  this.timeout(5000)
  f.stopTests.forEach(function(filename: string) {
    it(filename, function () {
      f.stopProgramTest(filename, 'regen');
    })
  })
})

describe('Trampoline CPS stopping tests', function () {
  this.timeout(5000)
  f.stopTests.forEach(function(filename: string) {
    it(filename, function () {
      f.stopProgramTest(filename, 'tcps')
    })
  })
})

describe('Yield stopping tests', function () {
  this.timeout(5000)
  f.stopTests.forEach(function(filename: string) {
    it(filename, function () {
      f.stopProgramTest(filename, 'yield');
    })
  })
})
