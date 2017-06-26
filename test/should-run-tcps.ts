import * as f from './testFixtures.js';

// NOTE(rachit): Don't use arrow functions, otherwise timeout doesn't work.
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

