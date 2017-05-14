'use strict';

import * as fs from 'fs';
import * as process from 'process';
import * as assert from 'assert';
const tmp = require('tmp');
const fsExtra = require('fs-extra');
import { spawn } from 'child_process';
const browserify = require('browserify');
const streamToString = require('stream-to-string');

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
    clojureCode: string,
    jsReceiver: (code: string) => any) {
  console.log(tmpDir);
  const run = makeSpawn(tmpDir);

  fs.mkdir(tmpDir + '/src', err => {
    fs.mkdir(tmpDir + '/src/cljs', writeCljFile);
  });

  function writeCljFile(exitCode: NodeJS.ErrnoException) {
    fs.writeFile(tmpDir + '/src/cljs/code.cljs',
        '(ns cljs.code)\n(enable-console-print!)\n' + clojureCode,
        copyJarAndBuild);
  }

  function copyJarAndBuild(exitCode: NodeJS.ErrnoException) {
    fsExtra.copySync(__dirname + '/../../../data/project.clj',
        tmpDir + '/project.clj');
    run('lein',
        'cljsbuild',
        'once').on('exit', runBrowserify);
  }

  function runBrowserify(exitCode: NodeJS.ErrnoException) {
    const outJs = browserify(tmpDir + '/out/main.js').bundle();
    streamToString(outJs, 'utf8', (err: any, str: string) => {
      jsReceiver(str);
    });
  }
}
