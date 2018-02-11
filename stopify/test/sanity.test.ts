import * as fs from "fs";
import * as f from "./testFixtures.js";
const assert = require("assert");

describe("Sanity check -- All tests pass without plugins", () => {
  f.unitTests.forEach((filename: string) => {
    const prog = fs.readFileSync(filename, "utf-8").toString();
    it(filename, () => {
      try {
        eval(prog);
        assert(true);
      } catch (e) {
        assert(false, `Sanity check failure: Failed to eval ${filename}`);
      }
    });
  });
});
