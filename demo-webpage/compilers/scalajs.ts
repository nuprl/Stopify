'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as smc from 'convert-source-map';
const fsExtra = require('fs-extra');

import { ScalaJSInterface } from './compiler';
import { makeSpawn, runBrowserify } from './utils';

export let ScalaJS : ScalaJSInterface = {
  compile(compilerDir: string,
    scalaCode: string,
    jsReceiver: (code: string) => any): void {
      console.log(`Invoking scala compiler in ${__dirname}`)
      const run = makeSpawn(compilerDir);
      const buildsbt = path.join(__dirname, '../../../data/build.sbt')
      const projectPlugins = path.join(__dirname, '../../../data/project/plugins.sbt')

      fsExtra.copySync(buildsbt, path.join(compilerDir, 'build.sbt'), {
        replace: true
      })
      if (!fs.existsSync(path.join(compilerDir, 'project'))) {
        fs.mkdirSync(path.join(compilerDir, 'project'));
      }
      fsExtra.copySync(projectPlugins,
        path.join(compilerDir, 'project/plugins.sbt'), {
          replace: true
        })

      fs.writeFileSync(path.join(compilerDir, "Main.scala"), scalaCode);

      run('sbt', 'fastOptJS').on('exit', () => {
        const srcFile = path.join(compilerDir,
                      'target/scala-2.12/blah-fastopt.js');
        const prog = fs.readFileSync(srcFile).toString();
        const inlineMap = smc.fromMapFileComment(prog,
          path.join(compilerDir, 'target/scala-2.12/')).toComment();
        fs.writeFileSync(srcFile, smc.removeMapFileComments(prog) + inlineMap)
        runBrowserify(srcFile, jsReceiver)
      });
    }
}
