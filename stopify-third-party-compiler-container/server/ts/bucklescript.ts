import * as fs from 'fs-extra';
import * as path from 'path';
import * as request from 'request-promise-native';
import { tmpDir, exec, inlineSourceMapFile } from './misc';

const bsconfig = __dirname + '/../resources/bucklescript/bsconfig.json';

export async function compile(code: string): Promise<string> {
  const dir = await tmpDir();
  try {
    await fs.writeFile(`${dir}/main.ml`, code);
    await fs.copy(bsconfig, `${dir}/bsconfig.json`);
    await exec('npm link bs-platform', dir);
    await exec('bsb', dir);
    await exec('browserify -o main.js lib/js/main.js', dir);
    return fs.readFile(`${dir}/main.js`, 'utf-8');
  }
  finally {
    await fs.remove(dir);
  }
}