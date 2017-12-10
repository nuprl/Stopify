import 'source-map-support/register'
import * as babel from 'babel-core';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as commander from 'commander';
import { parseArg } from './generic';
import * as webpack from 'webpack';
import * as tmp from 'tmp';
import { stopify } from './index';

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

commander.option(
  '--hofs <mode>',
  'either builtin or fill (default: builtin)',
  parseArg(x => x, x => /^(builtin|fill)$/.test(x),
    'invalid --hofs, see --help'),
  'builtin');

commander.option(
  '--js-args <mode>',
  'either simple or faithful (default: simple)',
  parseArg(x => x, x => /^(simple|faithful)$/.test(x),
    'invalid --js-args, see --help'),
  'simple');


commander.option('--require-runtime',
  `use require('stopify') to load the runtime system, which necessary to run
   on Node`);

commander.option(
  '--debug',
  'Insert suspensions between every line of code in the source program',
  false);

commander.arguments('<srcPath> <dstPath>');
const args = commander.parse(process.argv);

stopify(args.args[0], {
  debug: args.boolean,
  transform: args.transform,
  newMethod: args.handleNew,
  es: args.es,
  hofs: args.hofs,
  jsArgs: args.jsArgs,
  requireRuntime: args.requireRuntime
})
  .then(dstCode => {
    if (args.args[1]) {
      return fs.writeFile(args.args[1], dstCode);
    }
    else {
      return console.log(dstCode);
    }
  })
  .catch(reason => {
    console.log(`Stopify error`);
    console.log(reason);
    process.exit(1);
  });