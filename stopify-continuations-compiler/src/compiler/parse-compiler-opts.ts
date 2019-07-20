/**
 * Command-line to compile continuations.
 */
import * as commander from 'commander';
import { CompilerOpts } from '../types';
import { checkAndFillCompilerOpts } from './check-compiler-opts';

commander.option(
  '-t, --transform <transformation>',
  'either eager, lazy, catch, retval, original, or fudge');

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
commander.option('--compile-mode <mode>',
  `either normal or library (default: normal)`);

commander.arguments('<srcPath> <dstPath>');
const args = commander.parse(process.argv);

export const compilerOpts: CompilerOpts = checkAndFillCompilerOpts({
  compileFunction: args.func,
  getters: args.getters,
  debug: args.debug,
  captureMethod: args.transform,
  newMethod: args.new,
  es: args.es,
  compileMode: args.compileMode,
  jsArgs: args.jsArgs,
  requireRuntime: args.requireRuntime
});

const srcPath: string = args.args[0];
const dstPath: string = args.args[1];

if (!srcPath || !dstPath) {
  throw new Error('<srcPath> or <dstPath> is required');
}

export { srcPath, dstPath };
