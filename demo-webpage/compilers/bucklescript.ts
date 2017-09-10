'use strict';

import * as assert from 'assert';
const fs = require('fs-extra');

import {makeSpawn, runStopify} from './utils';
import {OCaml} from './compiler';

export let BuckleScript : OCaml = {
  compile(tmpDir: string,
    ocamlCode: string,
    jsReceiver: (code: string) => any): void {
      const run = makeSpawn(tmpDir);
      fs.writeFile(tmpDir + '/main.ml', ocamlCode, npmLink);

      function npmLink() {
        run('npm', 'link', 'bs-platform', 'Stopify').on('exit', copyBsConfig);
      }

      function copyBsConfig(exitCode: number) {
        assert(exitCode === 0);
        fs.copySync(__dirname + '/../../../data/bsconfig.json',
          tmpDir + '/bsconfig.json');
        run('bsb').on('exit', runStopify(tmpDir + '/lib/js/main.js', jsReceiver));
      }
  }
};

