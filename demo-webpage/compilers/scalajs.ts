'use strict';

import * as fs from 'fs';
import * as path from 'path';
const fsExtra = require('fs-extra');

import { ScalaJSInterface } from './compiler';
import { makeSpawn, runBrowserify } from './utils';

export let ScalaJS : ScalaJSInterface = {
  compile(compilerDir: string,
    scalaCode: string,
    jsReceiver: (code: string) => any): void {
      console.log(`Invoking scala compiler in ${__dirname}`)
      const run = makeSpawn(compilerDir);

      fs.writeFileSync(path.join(compilerDir, "Main.scala"), scalaCode);
      fsExtra.copySync(path.join(__dirname, '../../../data/build.sbt'),
        path.join(compilerDir, 'build.sbt'));
      fs.mkdirSync(path.join(compilerDir, 'project'));
      fsExtra.copySync(path.join(__dirname, '../../../data/project/plugins.sbt'),
        path.join(compilerDir, 'project/plugins.sbt'));

      run('sbt', 'fastOptJS').on('exit', runBrowserify(
        path.join(compilerDir, 'target/scala-2.12/blah-fastopt.js'), jsReceiver));
    }
}
