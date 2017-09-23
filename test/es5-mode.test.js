import * as f from './testFixtures.js';
import * as tmp from 'tmp';
import * as fs from 'fs';
import { execSync } from 'child_process';
const glob = require('glob');

describe('separate compilation using --es=es5 and --webpack', () => {
  const files = glob.sync('test/es5-mode/*.js');

  for (const src of files) {
    if (src.endsWith('.forever.js')) {
      test(`${src} (may run forever)`, () => {
        const { name: dst } = tmp.fileSync({ dir: ".", postfix: '.js' });
        execSync(`./bin/compile --webpack -t lazy --es=es5 ${src} ${dst}`);
        const r = execSync(`./bin/browser -t lazy --stop=5 --env=chrome -y 1 ${dst}`);
        fs.unlinkSync(dst);
      });
    }
    else {
      test(src, () => {
        const { name: dst } = tmp.fileSync({ dir: ".", postfix: '.js' });
        execSync(`./bin/compile --webpack -t lazy --es=es5 ${src} ${dst}`);
        const r = execSync(`./bin/browser -t lazy --env=chrome -y 1 ${dst}`);
        fs.unlinkSync(dst);
      });
    }
  }
});