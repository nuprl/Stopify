'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as fsExtra from 'fs-extra';

import { makeSpawn, inlineSourceMapFile } from './utils';
import { ClojureScript } from './compiler';

export let Cljs : ClojureScript = {
  compile(tmpDir: string,
    clojureCode: string,
    jsReceiver: (code: string) => any): void {
    console.log(tmpDir);
    const run = makeSpawn(tmpDir);

    fs.mkdir(tmpDir + '/src', (err: never) => {
      fs.mkdir(tmpDir + '/src/paws', writeCljFile);
    });

    function writeCljFile(exitCode: NodeJS.ErrnoException) {
      fs.writeFile(tmpDir + '/src/paws/code.cljs',
        '(ns paws.code)\n(enable-console-print!)\n' + clojureCode,
        copyJarAndBuild);
    }

    function copyJarAndBuild(exitCode: NodeJS.ErrnoException) {
      fsExtra.copySync(__dirname + '/../../data/project.clj',
        tmpDir + '/project.clj');
      const srcPath = path.join(tmpDir, 'out/main.js');
      const mapPath = srcPath + '.map';
      run('lein',
        'cljsbuild',
        'once').on('exit',
          inlineSourceMapFile(srcPath, mapPath, () =>
            jsReceiver(srcPath)(0)));
    }
  }
};
