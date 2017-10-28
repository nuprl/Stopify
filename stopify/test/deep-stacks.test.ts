import * as f from './testFixtures.js';

describe('deep-stacks', function() {
  f.deeptests.forEach(function(filename: string) {
    f.callCCTest(filename, "lazyDeep", "", "-d 1000");
  });
});
