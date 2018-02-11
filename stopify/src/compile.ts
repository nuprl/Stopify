import * as fs from "fs-extra";
import "source-map-support/register";
import * as parseCli from "stopify-continuations/dist/src/compiler/parseCli";
import { stopify } from "./index";

stopify(parseCli.srcPath, parseCli.compilerOpts)
  .then((dstCode) => {
    if (parseCli.dstPath) {
      return fs.writeFile(parseCli.dstPath, dstCode);
    } else {
      return console.log(dstCode);
    }
  })
  .catch((reason) => {
    console.log(`Stopify error`);
    console.log(reason);
    process.exit(1);
  });
