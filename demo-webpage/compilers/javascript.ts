'use strict'

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import { makeSpawn, runBrowserify } from './utils';
import { JavaScriptInterface } from './compiler';

export let JavaScript : JavaScriptInterface = {
  compile(tmpDir: string, code: string, jsReceiver: (code: string) => any) {
    console.log('Running javascript compiler')
    fs.writeFileSync(path.join(tmpDir, 'main.js'), code);

    runBrowserify(path.join(tmpDir, 'main.js'), jsReceiver)(0)
  }
}
