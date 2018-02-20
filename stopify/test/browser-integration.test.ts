import * as f from './testFixtures.js';
import * as glob from 'glob';

describe('In-browser tests', function () {
  f.intTests.forEach(function(filename: string) {
    f.browserTest(filename, "lazy");
    f.browserTest(filename, "lazyDeep");
  });

  glob.sync('test/browser/*.js').forEach(file => {
    f.browserTest(file, 'lazy');
    f.browserTest(file, 'lazyDeep');
  });
});
