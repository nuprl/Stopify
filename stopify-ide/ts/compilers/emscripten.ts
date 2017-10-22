'use strict';

import * as path from 'path';
import * as assert from 'assert';
import * as fs from 'fs-extra';

import { makeSpawn, inlineSourceMapFile } from './utils';
import { Emscripten } from './compiler';

export let Emcc : Emscripten = {
  compile(tmpDir: string,
    code: string,
    jsReceiver: (str: string) => any): void {
      const run = makeSpawn(tmpDir);
      console.log(tmpDir);
      fs.writeFile(tmpDir + '/main.cpp', code, () => copyMakefile(0));

      function copyMakefile(exitCode: number) {
        assert(exitCode === 0);
        fs.copySync(path.join(__dirname, '../../data/Makefile'),
          path.join(tmpDir, 'Makefile'));
        const srcPath = path.join(tmpDir, 'main.js');
        const mapPath = srcPath + '.map';
        run('make').on('exit',
          inlineSourceMapFile(srcPath, mapPath, () =>
            jsReceiver(srcPath)(0)));
      }
  }
};

