import * as f from './testFixtures';

describe('Yield transformation tests', function () {
  f.testFiles.forEach(function(filename: string) {
    it(filename, function () {
      f.stopifyTest(filename, 'yield');
    })
  })
})
