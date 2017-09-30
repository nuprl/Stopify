'use strict'

import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';

import { makeSpawn } from './utils';
import { JavaScriptInterface } from './compiler';

export let JavaScript : JavaScriptInterface = {
  compile(tmpDir: string, code: string, jsReceiver: (code: string) => any) {
    console.log('Running javascript compiler')
    const run = makeSpawn(tmpDir);
    fs.writeFile(path.join(tmpDir, 'main.js'), code, npmLink);

    function npmLink() {
      run('npm', 'link', 'stopify').on('exit', copyWebpack);
    }
    function copyWebpack(exitCode: number) {
      assert(exitCode === 0);
      fs.copySync(__dirname + '/../../data/webpack.config.js',
        tmpDir + '/webpack.config.js');
      return jsReceiver(path.join(tmpDir, 'main.js'))(0);
    }
  }
}
