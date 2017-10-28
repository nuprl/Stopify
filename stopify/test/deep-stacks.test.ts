import * as tmp from 'tmp';
import * as fs from 'fs';
import { execSync } from 'child_process';

test('triangle.js : shallow system stack but deep stack', () => {
  const { name: dst } = tmp.fileSync({ dir: ".", postfix: `triangle.js` });
  try {
    execSync(`./bin/compile -t lazyDeep test/deep-stacks/triangle.js ${dst}`);
    execSync(`./bin/run -d 500 -t lazyDeep ${dst}`);
  }
  finally {
    fs.unlinkSync(dst);
  }
});