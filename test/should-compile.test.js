const f = require('./testFixtures.js');
const path = require('path');
const fs = require('fs');
const file = require('file');

const testFilesR = f.walkSync(path.join(__dirname, './should-run'))
                    .filter((f) => f.endsWith('.js'))

const testFilesC = f.walkSync(path.join(__dirname, './should-compile'))
                    .filter((f) => f.endsWith('.js'))

const testFiles = testFilesC.concat(testFilesR)

describe('Programs retain value after transformation', function () {
  testFiles.forEach(filename => {
    const prog = fs.readFileSync(filename, 'utf-8').toString();
    it(filename, function () {
      this.timeout(1000)
      f.transformTest(prog)
    })
  })
})

