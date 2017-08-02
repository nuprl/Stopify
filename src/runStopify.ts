import * as minimist from 'minimist';
import * as types from './types';
import * as assert from 'assert';
import * as path from 'path';
import * as runtime from './runtime/default';

const opts = runtime.parseRuntimeOpts(process.argv.slice(2));

const srcModule = path.relative(__dirname, opts.filename);

runtime.run(require(srcModule), opts, () => { });