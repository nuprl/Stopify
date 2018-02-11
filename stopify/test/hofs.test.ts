import { execSync } from "child_process";
import * as fs from "fs";
import * as tmp from "tmp";
const glob = require("glob");

describe("separate compilation using --hofs=builtin", () => {
  const files = glob.sync("test/hofs/*.js");

  for (const src of files) {
    test(src, () => {
      const { name: dst } = tmp.fileSync({ dir: ".", postfix: ".js" });
      execSync(`./bin/compile -t lazy --hofs=fill ${src} ${dst}`);
      execSync(`./bin/browser chrome -t lazy --estimator countdown -y 1 ${dst}`);
      fs.unlinkSync(dst);
    });
  }
});
