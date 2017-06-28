import * as f from './testFixtures.js';

// NOTE(rachit): Don't use arrow functions, otherwise timeout doesn't work.
describe('CPS transform tests', function () {
  this.timeout(0)
  f.testFiles.forEach(function(filename: string) {
    it(filename, function () {
      f.stopifyTest(filename, 'cps')
    })
  })
  f.skipped.forEach((f: string) => {
    it.skip(f, () => {})
  })
})

describe('Regen transformation tests', function () {
  this.timeout(0)
  f.testFiles.forEach(function(filename: string) {
    it(filename, function () {
      f.stopifyTest(filename, 'regen');
    })
  })
  f.skipped.forEach((f: string) => {
    it.skip(f, () => {})
  })
})

describe('Trampoline CPS transform tests', function () {
  this.timeout(0)
  f.testFiles.forEach(function(filename: string) {
    it(filename, function () {
      f.stopifyTest(filename, 'tcps')
    })
  })
  f.skipped.forEach((f: string) => {
    it.skip(f, () => {})
  })
})

describe('Yield transformation tests', function () {
  this.timeout(0)
  f.testFiles.forEach(function(filename: string) {
    it(filename, function () {
      f.stopifyTest(filename, 'yield');
    })
  })
  f.skipped.forEach((f: string) => {
    it.skip(f, () => {})
  })
})
