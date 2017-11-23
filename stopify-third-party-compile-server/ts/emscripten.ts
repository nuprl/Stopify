import * as fs from 'fs-extra';
import * as path from 'path';
import * as request from 'request-promise-native';
import { tmpDir, exec, inlineSourceMapFile } from './misc';

const makefile = path.join(__dirname, '../resources/emscripten/Makefile');

export function compile(code: string): Promise<string> {
  return tmpDir()
    .then(tmpDir => {
      const cppFile = `${tmpDir}/main.cpp`;
      const jsFile = `${tmpDir}/main.js`;
      const mapFile = `${jsFile}.map`;
      return fs.writeFile(cppFile, code)
        .then(() => fs.copy(makefile, `${tmpDir}/Makefile`))
        .then(() => exec('make', tmpDir))
        .then(() => inlineSourceMapFile(jsFile, mapFile))
        .then(() => fs.readFile(jsFile, 'utf-8'))
        .then(jsCode =>
          fs.remove(tmpDir)
          .then(() => jsCode));
    });
}