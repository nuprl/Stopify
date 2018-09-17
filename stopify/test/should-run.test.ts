import * as f from './testFixtures.js';

const copts = "--eval --js-args=full";
const ropts = "--estimator countdown -y 1"

describe('call/cc', function() {
  f.unitTests.forEach(function(filename: string) {
    f.callCCTest(filename, `-t lazy --new wrapper ${copts}`, ropts);
    f.callCCTest(filename, `-t lazy --new direct ${copts}`, ropts);
    f.callCCTest(filename, `-t catch ${copts}`, ropts);
  });
});
