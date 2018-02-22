import * as f from './testFixtures'
import * as tmp from 'tmp';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

function deepStackTest(srcPath: string) {
  const testName = `${srcPath} (deep stack test)`;

  it(testName, () => {
    const basename = path.basename(srcPath, '.js')
    const { name: dstPath } =
      tmp.fileSync({ dir: ".", postfix: `${basename}.js` });

    execSync(
      `./bin/compile --require-runtime -t lazyDeep ${srcPath} ${dstPath}`);

    try {
      execSync(`node ${dstPath} --stack-size 500`, { timeout: 60000 });
    }
    finally {
      // NOTE(arjun): I wouldn't mind if these were always left around.
      fs.unlinkSync(dstPath);
    }
  });
}

describe('deep-stacks', function () {
  f.deepTests.forEach((filename: string) => {
    deepStackTest(filename)
  })
})
