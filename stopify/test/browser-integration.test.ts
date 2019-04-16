import * as f from './testFixtures.js';
import * as glob from 'glob';

describe('In-browser tests', function () {

  glob.sync('test/browser/*.js').forEach(file => {
    f.browserTest(file, 'lazy');
  });
});
