import * as f from './testFixtures';

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
