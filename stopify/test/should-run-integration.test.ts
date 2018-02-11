import * as f from "./testFixtures.js";

describe("Call/CC integration tests", () => {
  f.intTests.forEach((filename: string) => {
    f.callCCTest(filename, "lazy");
    f.callCCTest(filename, "eager");
    f.callCCTest(filename, "retval");
  });
});
