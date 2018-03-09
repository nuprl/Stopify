import * as assert from 'assert';
const glob = require('glob');
import * as fs from 'fs';
import * as tmp from 'tmp';
import { spawnSync } from 'child_process';

describe("tesing programs that use call/cc", () => {
  const files = glob.sync("test-data/*.js", {});
  for (const src of files) {
    for (const method of [ 'lazy', 'eager', 'retval' ]) {
      if (method === 'retval') {
        // NOTE(arjun): Sam  intentionally broke full callcc for retval for
        // Stopify. We should restore it only if there is no significant
        // performance impact.
        test.skip(`${src} (${method})`, () => { });
        continue;
      }
      test(`${src} (${method})`, () => {
        const { name: dst } = tmp.fileSync({ dir: '.', postfix: '.js' });
        assert(spawnSync('./bin/stopify-continuations.js',
                 ['--require-runtime', '-t', method, src, dst],
                 { stdio: 'inherit' }).status === 0,
          'error during compilation');
        assert(spawnSync('node', [ dst ], { stdio: 'inherit' }).status === 0,
          'error while running');
        fs.unlinkSync(dst);
      });
    }
  }
});
