import * as f from './testFixtures.js';

describe('Yield integration tests', function () {
  f.intTests.forEach(function(filename: string) {
    it(filename, function () {
      f.stopifyTest(filename, 'yield', 500);
    })
  })
})

describe('Call/CC integration tests', function () {
  f.intTests.forEach(function(filename: string) {
    f.callCCTest(filename, "lazy");
    f.callCCTest(filename, "eager");
    f.callCCTest(filename, "retval");
  });
});
