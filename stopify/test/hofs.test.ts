import * as tmp from 'tmp';
import * as fs from 'fs';
import { execSync } from 'child_process';
const glob = require('glob');

describe('separate compilation using --hofs=fill', () => {
  const files = glob.sync('test/hofs/*.js');

  for (const src of files) {
    test(src, () => {
      const { name: dst } = tmp.fileSync({ dir: ".", postfix: '.js' });
      execSync(`./bin/compile -t lazy --hofs=fill ${src} ${dst}`);
      execSync(`./bin/browser chrome -t lazy --estimator countdown -y 1 ${dst}`, { stdio: 'inherit' });
      fs.unlinkSync(dst);
    });
  }
});
