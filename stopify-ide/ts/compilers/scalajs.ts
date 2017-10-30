import * as fs from 'fs-extra';
import * as path from 'path';
import { ScalaJSInterface } from './compiler';
import * as utils from './utils';

const buildsbt = path.join(__dirname, '../../data/build.sbt')
const projectPlugins = path.join(__dirname, '../../data/project/plugins.sbt')

export let ScalaJS : ScalaJSInterface = {
  compile(tmpDir: string, code: string): Promise<string> {
    const localPluginsPath = path.join(tmpDir, 'project', 'plugins.sbt');
    const srcPath = path.join(tmpDir, 'target', 'scala-2.12',
      'blah-fastopt.js');
    const mapPath = srcPath + '.map';

    return fs.copy(buildsbt, path.join(tmpDir, 'build.sbt'))
      .then(() => fs.mkdir(path.join(tmpDir, 'project')))
      .then(() => fs.copy(projectPlugins, localPluginsPath))
      .then(() => fs.writeFile(path.join(tmpDir, 'Main.scala'), code))
      .then(() => utils.exec('sbt fastOptJS', tmpDir))
      .then(() => utils.inlineSourceMapFile(srcPath, mapPath));
  }
}