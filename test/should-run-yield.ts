import * as f from './testFixtures.js';
import * as path from 'path';
import * as fs from  'fs';
import * as file from 'file';

const testFiles = f.walkSync(path.join(__dirname, './should-run'))
  .filter((f) => f.endsWith('.js'))

// NOTE(rachit): Don't use arrow functions, otherwise timeout doesn't work.
describe('Yield transformation tests', function () {
  testFiles.forEach(function(filename) {
    const prog = fs.readFileSync(filename, 'utf-8').toString();
    it(filename, function () {
      this.timeout(1000)
      f.retainValueTest(prog, 'yieldPass')
    })
  })
})

