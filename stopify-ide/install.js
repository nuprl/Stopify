const { execSync } = require('child_process');
const { copySync } = require('fs-extra');

function exec(line) {
  execSync(line, { stdio: 'inherit' });
}
const browserify = './node_modules/.bin/browserify';
exec('./node_modules/.bin/tsc');

exec(`${browserify} -d dist/paws-client/stopify.js -o dist/stopify.js`);
exec(`${browserify} -d dist/paws-client/container.js -o dist/container.js`);

copySync('../stopify/dist/stopify.bundle.js', 'dist/stopify.bundle.js');
