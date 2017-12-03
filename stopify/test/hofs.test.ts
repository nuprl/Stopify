import * as f from './testFixtures.js';
import * as tmp from 'tmp';
import * as fs from 'fs';
import { execSync } from 'child_process';
const glob = require('glob');

describe('separate compilation using --hofs=builtin', () => {
  const files = glob.sync('test/hofs/*.js');

  for (const src of files) {
    test(src, () => {
      const { name: dst } = tmp.fileSync({ dir: ".", postfix: '.js' });
      execSync(`./bin/compile -t lazy --hofs=builtin ${src} ${dst} --external-rts`);
      const r = execSync(`./bin/browser --env chrome -t lazy --estimator countdown -y 1 ${dst}`);
      fs.unlinkSync(dst);
    });
  }
});
