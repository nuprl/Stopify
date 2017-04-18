import * as f from './testFixtures.js';
const path = require('path');
const fs = require('fs');
const file = require('file');

const testFilesR = f.walkSync(path.join(__dirname, './should-run'))
                    .filter((f) => f.endsWith('.js'))

const testFilesC = f.walkSync(path.join(__dirname, './should-compile'))
                    .filter((f) => f.endsWith('.js'))

const testFiles = testFilesC.concat(testFilesR)

describe('Program can successfully be transformed', function () {
  this.timeout(10000);
  testFiles.forEach(filename => {
    const prog = fs.readFileSync(filename, 'utf-8').toString();
    it(filename, function () {
      f.transformTest(prog)
    })
  })
})

