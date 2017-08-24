import * as babel from 'babel-core';
import * as minimist from 'minimist';
import * as fs from 'fs';
import * as path from 'path';
import toModule from './callcc/toModule';

const stderr = process.stderr;

const parseArgs = {
  alias: { 
    "t": "transform"
  }
};
const args = minimist(process.argv.slice(2), parseArgs);
const srcPath = args._[0];
const dstPath = args._[1];
const transform = args.transform;

const validTransforms = [ 'eager', 'lazy', 'retval', 'original', 'fudge' ];
if (validTransforms.includes(transform) === false) {
  stderr.write(`--transform must be one of ${validTransforms.join(', ')}, got ${transform}.\n`);
  process.exit(1);
}
if (typeof srcPath === 'undefined') {
  stderr.write(`missing source file name`);
  process.exit(1);
}
if ((fs.existsSync(srcPath) && fs.statSync(srcPath).isFile()) === false) {
  stderr.write(`${srcPath} is not a file`);
  process.exit(1);
}


const opts = {
  plugins: [[toModule, { captureMethod: transform }]],
  babelrc: false,
  ast: false,
  code: true
};
babel.transformFile(srcPath, opts, (err, result) => {
  if (err !== null) {
    throw err;
  }
  const { code } = result;
  if (typeof dstPath === 'undefined') {
    process.stdout.write(code!);
    process.exit(0);  
  }
  fs.writeFile(dstPath, code!, (err) => {
    if (err !== null) {
      stderr.write(`error writing result (--dst must be a path)`);
      process.exit(1);
    }
    process.exit(0);
  });
});