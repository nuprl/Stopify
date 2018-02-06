import * as fs from 'fs-extra';
import * as path from 'path';
import * as request from 'request-promise-native';
import { tmpDir, exec, inlineSourceMapFile } from './misc';

const makefile = path.join(__dirname, '../resources/emscripten/Makefile');

export async function compile(code: string): Promise<string> {
  const dir = await tmpDir();
  try {
    const cppFile = `${dir}/main.cpp`;
    const jsFile = `${dir}/main.js`;
    const mapFile = `${jsFile}.map`;
    await fs.writeFile(cppFile, code);
    await fs.copy(makefile, `${dir}/Makefile`);
    await exec('make', dir);
    await inlineSourceMapFile(jsFile, mapFile);
    return fs.readFile(jsFile, 'utf-8');
  }
  finally {
    await fs.remove(dir);
  }
}