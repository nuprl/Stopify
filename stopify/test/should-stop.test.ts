import * as f from './testFixtures.js';

describe('Call/CC stopping tests', function () {
  f.stopTests.forEach((filename: string) => {
    f.stopCallCCTest(filename, 'lazy');
    f.stopCallCCTest(filename, 'eager');
    f.stopCallCCTest(filename, 'retval');
    // TODO(rachit): Add deep stacks test.
  });
});
