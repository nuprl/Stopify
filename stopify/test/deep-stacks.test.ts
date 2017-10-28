import * as f from './testFixtures.js';

describe('deep-stacks', function() {
  f.deepTests.forEach(function(filename: string) {
    f.callCCTest(filename, "lazyDeep", "", "-d 1000");
  });
});
