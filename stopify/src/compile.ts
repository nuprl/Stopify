import 'source-map-support/register';
import * as fs from 'fs';
import { stopify } from './index';
import * as parseCli from '@stopify/continuations/dist/src/compiler/parse-compiler-opts';

function main() {
  const src = fs.readFileSync(parseCli.srcPath, 'utf8');
  const dstCode = stopify(src, parseCli.compilerOpts);
  if (parseCli.dstPath) {
    fs.writeFileSync(parseCli.dstPath, dstCode);
  }
  else {
    console.log(dstCode);
  }
}

try {
  main()
} catch (reason) {
  console.log(`Stopify error`);
  console.log(reason);
  process.exit(1);
};
