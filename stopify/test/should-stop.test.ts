import * as f from './testFixtures.js';

describe('Call/CC stopping tests', function () {
  f.stopTests.forEach((filename: string) => {
    f.stopCallCCTest(filename, 'lazy');
    f.stopCallCCTest(filename, 'lazyDeep');
    f.stopCallCCTest(filename, 'eager');
    f.stopCallCCTest(filename, 'retval');
  });
});
