import 'source-map-support/register'
import * as fs from 'fs-extra';
import { stopify } from './index';
import * as parseCli from 'stopify-continuations/dist/src/compiler/parse-compiler-opts';

stopify(parseCli.srcPath, parseCli.compilerOpts)
  .then(dstCode => {
    if (parseCli.dstPath) {
      return fs.writeFile(parseCli.dstPath, dstCode);
    }
    else {
      return console.log(dstCode);
    }
  })
  .catch(reason => {
    console.log(`Stopify error`);
    console.log(reason);
    process.exit(1);
  });
