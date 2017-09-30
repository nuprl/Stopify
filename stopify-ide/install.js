const { execSync } = require('child_process');
const { copyFileSync } = require('fs');

const browserify = './node_modules/.bin/browserify';
execSync('./node_modules/.bin/tsc');

execSync(`${browserify} dist/paws-client/stopify.js -o dist/stopify.js`);
execSync(`${browserify} dist/paws-client/container.js -o dist/container.js`);
execSync(`${browserify} dist/paws-client/runner.js -o dist/runner.js`);

copyFileSync('../stopify/dist/stopify.bundle.js', 'dist/stopify.bundle.js');