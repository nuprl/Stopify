import * as path from 'path';
import * as fs from 'fs-extra';
import * as utils from './utils';

import { Emscripten } from './compiler';

const makefile = path.join(__dirname, '../../data/Makefile');

export let Emcc : Emscripten = {
  compile(tmpDir: string, code: string): Promise<string> {
    const srcPath = path.join(tmpDir, 'main.js');
    const mapPath = srcPath + '.map';
    return fs.writeFile(`${tmpDir}/main.cpp`, code)
      .then(() => fs.copy(makefile, `${tmpDir}/Makefile`))
      .then(() => utils.exec('make', tmpDir))
      .then(() => utils.inlineSourceMapFile(srcPath, mapPath));
  }
}