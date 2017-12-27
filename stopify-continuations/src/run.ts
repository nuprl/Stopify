import * as minimist from 'minimist';
import * as types from './types';
import * as assert from 'assert';
import * as path from 'path';
import { parseRuntimeOpts } from './cli-parse';
import runtime from './runtime/default';

const opts = parseRuntimeOpts(process.argv.slice(2));
const srcModule = path.relative(__dirname, path.resolve(opts.filename));
runtime.run(() => require(srcModule), opts, () => { });
