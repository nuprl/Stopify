import * as fs from 'fs-extra';
import * as path from 'path';
import * as request from 'request-promise-native';
import { tmpDir, exec, inlineSourceMapFile } from './misc';

const build = __dirname + '/../resources/scalajs/build.sbt';
const plugins = __dirname + '/../resources/scalajs/plugins.sbt';

export function compile(code: string): Promise<string> {
  return tmpDir()
    .then(tmpDir => {
      const jsFile = `${tmpDir}/target/scala-2.12/blah-fastopt.js`;
      const mapPath = `${jsFile}.map`;
      return fs.copy(build, `${tmpDir}/build.sbt`)
        .then(() => fs.mkdir(`${tmpDir}/project`))
        .then(() => fs.copy(plugins, `${tmpDir}/project/plugins.sbt`))
        .then(() => fs.writeFile(`${tmpDir}/Main.scala`, code))
        .then(() => exec('sbt fastOptJS', tmpDir))
        .then(() => inlineSourceMapFile(jsFile, mapPath))
        .then(() => fs.readFile(jsFile, 'utf-8'))
        .then(jsCode =>
          fs.remove(tmpDir)
          .then(() => jsCode));
    });
}
