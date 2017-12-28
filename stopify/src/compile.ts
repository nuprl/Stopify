import 'source-map-support/register'
import * as babel from 'babel-core';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as commander from 'commander';
import { parseArg } from './generic';
import * as webpack from 'webpack';
import * as tmp from 'tmp';
import { stopify } from './index';
import * as parseCli from 'stopify-continuations/dist/src/compiler/parseCli';
const stderr = process.stderr;

stopify(parseCli.srcPath, parseCli.compilerOpts)
  .then(dstCode => {
    if (parseCli.dstPath) {
      return fs.writeFile(parseCli.dstPath, dstCode);
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