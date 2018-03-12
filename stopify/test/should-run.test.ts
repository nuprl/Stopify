import * as f from './testFixtures.js';

const copts = "--eval --js-args=full";
const ropts = "--estimator countdown -y 1"

describe('call/cc', function() {
  f.unitTests.forEach(function(filename: string) {
    f.callCCTest(filename, `-t lazy --new wrapper ${copts}`, ropts);
    f.callCCTest(filename, `-t lazy --new direct ${copts}`, ropts);
    f.callCCTest(filename, `-t retval ${copts}`, ropts);
    f.callCCTest(filename, `-t eager ${copts}`, ropts);

    // Deep stacks tests.
    f.callCCTest(filename, `-t lazy ${copts}`,
      `--restore-frames 1 --stack-size 1000 ${ropts}`);

    f.callCCTest(filename, `-t retval ${copts}`,
      `--restore-frames 1 --stack-size 1000 ${ropts}`);
  });
});
