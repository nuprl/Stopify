import * as f from './testFixtures.js';

describe('In-browser tests', function () {
  f.intTests.forEach(function(filename: string) {
    f.browserTest(filename, "lazy");
  });
});
