'use strict';

import * as fs from 'fs';
import * as process from 'process';
import * as assert from 'assert';
import * as tmp from 'tmp';
import * as fsExtra from 'fs-extra';
import { spawn } from 'child_process';
import * as browserify from 'browserify';
import * as streamToString from 'stream-to-string';

function makeSpawn(wd) {
  const opts = {
    stdio: ['ignore', process.stdout, process.stderr],
    cwd: wd
  };
  return function(command, ...args) {
    return spawn(command, args || [], opts);
  };
}

export let buildDir;

export function compile(clojureCode, jsReceiver) {
  tmp.dir((_, tmpDir) => {
    buildDir = tmpDir + '/';
    const run = makeSpawn(tmpDir);

    fs.mkdir(tmpDir + '/src', err => {
      fs.mkdir(tmpDir + '/src/cljs', writeCljFile);
    });

    function writeCljFile(exitCode) {
      fs.writeFile(tmpDir + '/src/cljs/code.cljs',
            '(ns cljs.code)\n(enable-console-print!)\n' + clojureCode,
            copyJarAndBuild);
    }

    function copyJarAndBuild(exitCode) {
      fsExtra.copySync(__dirname + '/../../../data/project.clj',
            tmpDir + '/project.clj');
      console.log(tmpDir);
      run('lein',
            'cljsbuild',
            'once').on('exit', runBrowserify);
    }

    function runBrowserify(exitCode) {
      const outJs = browserify(tmpDir + '/out/main.js').bundle();
      streamToString(outJs, 'utf8', (err, str) => {
        jsReceiver(str);
      });
    }
  });
}
