'use strict';

import * as fs from 'fs';
import * as path from 'path';
const fsExtra = require('fs-extra');

import { ScalaJSInterface } from './compiler';
import { makeSpawn, inlineSourceMapFile } from './utils';

export let ScalaJS : ScalaJSInterface = {
  compile(compilerDir: string,
    scalaCode: string,
    jsReceiver: (code: string) => any): void {
      console.log(`Invoking scala compiler in ${__dirname}`)
      const run = makeSpawn(compilerDir);
      const buildsbt = path.join(__dirname, '../../data/build.sbt')
      const projectPlugins = path.join(__dirname, '../../data/project/plugins.sbt')

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

      run('sbt', 'fastOptJS').on('exit', npmLink);

      const srcPath = path.join(compilerDir, 'target/scala-2.12/blah-fastopt.js');
      const mapPath = srcPath + '.map';
      function npmLink() {
        run('npm', 'link', 'Stopify').on('exit',
          inlineSourceMapFile(srcPath, mapPath, () =>
            jsReceiver(srcPath)(0)));
      }
    }
}
