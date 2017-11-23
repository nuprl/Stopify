import * as fs from 'fs-extra';
import * as path from 'path';
import * as request from 'request-promise-native';
import { tmpDir, exec, inlineSourceMapFile } from './misc';

const bsconfig = __dirname + '/../resources/bucklescript/bsconfig.json';

export function compile(code: string): Promise<string> {
  return tmpDir()
    .then(tmpDir => {
      return fs.writeFile(`${tmpDir}/main.ml`, code)
        .then(() => fs.copy(bsconfig, `${tmpDir}/bsconfig.json`))
        .then(() => exec('npm link bs-platform', tmpDir))
        .then(() => exec('bsb', tmpDir))
        .then(() => exec('browserify -o main.js lib/js/main.js', tmpDir))
        .then(() => fs.readFile(`${tmpDir}/main.js`, 'utf-8'))
        .then(jsCode =>
          fs.remove(tmpDir)
          .then(() => jsCode));
    });
}