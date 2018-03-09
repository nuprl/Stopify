/**
 * Command-line to compile continuations.
 */
import * as commander from 'commander';
import { CompilerOpts } from '../types';
import { checkAndFillCompilerOpts } from './checkOpts';

commander.option(
  '-t, --transform <transformation>',
  'either eager, lazy, retval, original, or fudge');

commander.option(
  '-n, --new <new>',
  'either direct or wrapper');

commander.option(
  '--es <mode>',
  'either sane or es5 (default: sane)');

commander.option(
  '--eval',
  'Support eval');

commander.option(
  '--hofs <mode>',
  'either builtin or fill (default: builtin)');

commander.option(
  '--js-args <mode>',
  'either simple, faithful, or full (default: simple)');

commander.option(
  '--getters',
  'enable support for getters/setters (default: false)');

commander.option('--require-runtime',
  `use require('stopify') to load the runtime system, which necessary to run
   on Node`);

commander.option(
  '--debug',
  'Insert suspensions between every line of code in the source program');

commander.option(
  '--func',
  'Compile a top-level function. Doesnt add runtime initialization or cleanup');

commander.arguments('<srcPath> <dstPath>');
const args = commander.parse(process.argv);

export const compilerOpts: CompilerOpts = checkAndFillCompilerOpts({
  compileFunction: args.func,
  getters: args.getters,
  debug: args.debug,
  captureMethod: args.transform,
  newMethod: args.new,
  eval: args.eval,
  es: args.es,
  hofs: args.hofs,
  jsArgs: args.jsArgs,
  requireRuntime: args.requireRuntime
});

const srcPath: string = args.args[0];
const dstPath: string = args.args[1];

if (!srcPath || !dstPath) {
  throw new Error('<srcPath> or <dstPath> is required')
}

export { srcPath, dstPath }
