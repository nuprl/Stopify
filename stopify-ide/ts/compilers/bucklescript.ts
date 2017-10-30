import * as fs from 'fs-extra';
import * as utils from './utils';
import { OCaml } from './compiler';

const bsconfigJson = __dirname + '/../../data/bsconfig.json'

export let BuckleScript : OCaml = {
  compile(tmpDir: string, ocamlCode: string): Promise<string> {
    return fs.writeFile(`${tmpDir}/main.ml`, ocamlCode)
      .then(() => utils.exec('npm link bs-platform', tmpDir))
      .then(() => fs.copy(bsconfigJson, `${tmpDir}/bsconfig.json`))
      .then(() => utils.exec('bsb', tmpDir))
      .then(() => `${tmpDir}/lib/js/main.js`);
  }
}
