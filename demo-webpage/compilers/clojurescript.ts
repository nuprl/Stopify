'use strict';

import * as fs from 'fs';
const fsExtra = require('fs-extra');

import {makeSpawn, runStopify} from './utils';
import {ClojureScript} from './compiler';

export let Cljs : ClojureScript = {
  compile(tmpDir: string,
    clojureCode: string,
    jsReceiver: (code: string) => any): void {
    console.log(tmpDir);
    const run = makeSpawn(tmpDir);

    fs.mkdir(tmpDir + '/src', (err: never) => {
      fs.mkdir(tmpDir + '/src/cljs', npmLink);
    });

    function npmLink() {
      run('npm', 'link', 'Stopify').on('exit', writeCljFile);
    }

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
        'once').on('exit', runStopify(tmpDir + '/out/main.js', jsReceiver));
    }
  }
};
