import * as f from "./testFixtures.js";

describe("call/cc", () => {
  f.unitTests.forEach((filename: string) => {
    f.callCCTest(filename, "lazy");
    f.callCCTest(filename, "lazy", "--new direct");
    f.callCCTest(filename, "eager");
    f.callCCTest(filename, "retval");
  });
});
