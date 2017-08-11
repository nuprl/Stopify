import * as f from './testFixtures.js';
import * as path from 'path';

describe('Yield transformation tests', function () {

  f.unitTests.forEach(function(filename: string) {
    it(`${filename} (yield)`, function () {
      f.stopifyTest(filename, 'yield', 500);
    })
  })
})

describe('call/cc', function() {
  f.unitTests.forEach(function(filename: string) {
    f.callCCTest(filename, "lazy");
    f.callCCTest(filename, "eager");
    f.callCCTest(filename, "retval");
  });  
});
