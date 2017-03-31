const f = require('./testFixtures.js');
const path = require('path');
const fs = require('fs');

const testDir = path.join(__dirname, './should-compile');

fs.readdirSync(testDir).forEach((file) => {
  const prog = fs.readFileSync(path.join(testDir, file), 'utf-8').toString();
  it(file.toString(), () => {
    f.transformTest(prog)
  })
})

