import * as f from './testFixtures.js';

describe('call/cc', function() {
  f.unitTests.forEach(function(filename: string) {
    f.callCCTest(filename, "lazy");
    //f.callCCTest(filename, "eager");
    //f.callCCTest(filename, "retval");
  });
});
