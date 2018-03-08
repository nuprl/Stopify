import * as f from './testFixtures.js';
import * as glob from 'glob';

describe('In-browser tests', function () {
  f.intTests.forEach(function(filename: string) {
    f.browserTest(filename, "lazy");
    // TODO(rachit): Add deep stacks test
  });

  glob.sync('test/browser/*.js').forEach(file => {
    f.browserTest(file, 'lazy');
  });
});
