import * as glob from "glob";
import * as f from "./testFixtures.js";

describe("In-browser tests", () => {
  f.intTests.forEach((filename: string) => {
    f.browserTest(filename, "lazy");
  });

  glob.sync("test/browser/*.js").forEach((file) => {
    f.browserTest(file, "lazy");
  });
});
