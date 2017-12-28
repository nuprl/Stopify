/**
 * Command-line to compile continuations.
 */
import * as babel from 'babel-core';
import * as t from 'babel-types';
import * as commander from 'commander';
import * as fs from 'fs-extra';
import { NodePath, Visitor } from 'babel-traverse';
import callcc from '../callcc/callcc';
import { flatness } from './flatness';
import { parseArg } from '../generic';
import { transformFromAst } from '../common/helpers';
import { CompilerOpts, HandleNew, CaptureMethod } from '../types';
import { fastFreshId } from '../callcc/index';


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
   on Node`,
  false);

commander.option(
  '--debug',
  'Insert suspensions between every line of code in the source program',
  false);

commander.arguments('<srcPath> <dstPath>');
const args = commander.parse(process.argv);

const compilerOpts: CompilerOpts = {
  debug: args.debug,
  captureMethod: args.transform,
  newMethod: args.new,
  es: args.es,
  hofs: args.hofs,
  jsArgs: args.jsArgs,
  requireRuntime: args.requireRuntime
};

const visitor: Visitor = {
  Program(path: NodePath<t.Program>, state: CompilerOpts) {
    fastFreshId.init(path);
    transformFromAst(path, [flatness]);
    transformFromAst(path, [[callcc, compilerOpts]]);
    path.stop();
  }
};

const opts: babel.TransformOptions = {
  plugins: [function() { return { visitor }; }],
  babelrc: false,
  code: true,
  ast: false,
};


const result = babel.transformFileSync(args.args[0], opts);
fs.writeFileSync(args.args[1], result.code);