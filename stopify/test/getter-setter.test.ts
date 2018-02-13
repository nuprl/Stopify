import * as tmp from 'tmp';
import * as fs from 'fs';
import { execSync } from 'child_process';
const glob = require('glob');

describe('getter and setter support', () => {
  const files = glob.sync('test/getter-setter/*.js');

  for (const src of files) {
    test(src, () => {
      const { name: dst } = tmp.fileSync({ dir: ".", postfix: '.js' });
      execSync(`./bin/compile -t lazy --getters ${src} ${dst}`);
      execSync(`./bin/browser chrome -t lazy --estimator countdown -y 1 ${dst}`);
      fs.unlinkSync(dst);
    });
  }
});
