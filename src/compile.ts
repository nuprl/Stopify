import * as babel from 'babel-core';
import * as fs from 'fs';
import * as path from 'path';
import { plugin as stopifyCallCC } from './callcc/stopifyCallCC';
import * as commander from 'commander';
import { parseArg } from './generic';

const stderr = process.stderr;

commander.option(
  '-t, --transform <transformation>',
  'either eager, lazy, retval, original, or fudge',
  parseArg(x => x,
    (x) => /^(eager|lazy|retval|original|fudge)$/.test(x),
    'invalid --transform, see --help'),
  'lazy');

commander.option(
  '-n, --new <new>',
  'either direct or wrapper',
  parseArg(x => x, x => /^(direct|wrapper)$/.test(x),
    'invalid --new, see --help'),
  'wrapper');

commander.option(
  '--es <mode>',
  'either sane or es5 (default: sane)',
  parseArg(x => x, x => /^(sane|es5)$/.test(x),
    'invalid --es, see --help'),
  'sane');

commander.arguments('<srcPath> <dstPath>');
const args = commander.parse(process.argv);
const srcPath = args.args[0];
const dstPath = args.args[1];

const opts = {
  plugins: [[stopifyCallCC, {
    captureMethod: args.transform,
    handleNew: args.new,
    esMode: args.esMode
  }]],
  babelrc: false,
  ast: false,
  code: true,
  minified: true,
  comments: false
};

if (args.transform === 'original') {
  const src = fs.readFileSync(srcPath, 'utf8')
  if (args.dstPath === undefined) {
    console.log(src);
  }
  else {
    fs.writeFileSync(dstPath, src);
  }
  process.exit(0);
}

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
