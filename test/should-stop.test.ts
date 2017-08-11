import * as f from './testFixtures.js';

describe('Yield stopping tests', function () {
  f.stopTests.forEach(function(filename: string) {
    it(filename, function () {
      f.stopProgramTest(filename, 'yield');
    })
  })
})

describe('Call/CC stopping tests', function () {
  f.stopTests.forEach((filename: string) => {
    f.stopCallCCTest(filename, 'lazy');
    f.stopCallCCTest(filename, 'eager');
    f.stopCallCCTest(filename, 'retval');
  });
});
