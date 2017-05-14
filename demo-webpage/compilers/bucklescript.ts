'use strict';

import * as fs from 'fs';
import * as process from 'process';
import * as assert from 'assert';
const tmp = require('tmp');
const fsExtra = require('fs-extra');
import { spawn } from 'child_process';
const browserify = require('browserify');
const streamToString = require('stream-to-string');

// Wrapper for spawm that (1) runs the command in the given directory,
// (2) closes standard input.
function makeSpawn(wd: string) {
  const opts = {
    stdio: ['ignore', process.stdout, process.stderr],
    cwd: wd
  };
  return function(command: string, ...args: string[]) {
    return spawn(command, args || [], opts);
  };
}

export function compile(tmpDir: string,
    ocamlCode: string,
    jsReceiver: (code: string) => any) {
  const run = makeSpawn(tmpDir);
  fs.writeFile(tmpDir + '/main.ml', ocamlCode, npmLink);

  function npmLink() {
    run('npm', 'link', 'bs-platform').on('exit', copyBsConfig);
  }

  function copyBsConfig(exitCode: number) {
    assert(exitCode === 0);
    fsExtra.copySync(__dirname + '/../../../data/bsconfig.json',
      tmpDir + '/bsconfig.json');
    run('bsb').on('exit', runBrowserify);
  }

  function runBrowserify(exitCode: number) {
    console.log('Exit code is ', exitCode);
    assert(exitCode === 0);
    const outJs = browserify(tmpDir + '/lib/js/main.js')
      .bundle();
    streamToString(outJs, 'utf8', (err: any, str: string) => {
      jsReceiver(str);
    });
  }
}
