import 'source-map-support/register';
import * as fs from 'fs-extra';
import { stopify } from './index';
import * as parseCli from 'stopify-continuations/dist/src/compiler/parse-compiler-opts';

async function main() {
  const src = await fs.readFile(parseCli.srcPath, 'utf8');
  const dstCode = stopify(src, parseCli.compilerOpts);
  if (parseCli.dstPath) {
    await fs.writeFile(parseCli.dstPath, dstCode);
  }
  else {
    console.log(dstCode);
  }
}

main()
  .catch(reason => {
    console.log(`Stopify error`);
    console.log(reason);
    process.exit(1);
  });
