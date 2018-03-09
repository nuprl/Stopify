import * as f from './testFixtures.js';
import * as glob from 'glob';

describe('In-browser tests', function () {
  f.intTests.forEach(function(filename: string) {
    f.browserTest(filename, "-t lazy", "");
    f.browserTest(filename, "-t lazy", "--stack-size 1000 --restore-frames 1");
  });

  glob.sync('test/browser/*.js').forEach(file => {
    f.browserTest(file, "-t lazy", "");
  });
});
