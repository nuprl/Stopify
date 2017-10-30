import * as path from 'path';
import * as fs from 'fs-extra';
import * as utils from './utils';
import { ClojureScript } from './compiler';

const clj = `${__dirname}/../../data/project.clj`;

export let Cljs : ClojureScript = {
  compile(tmpDir: string, src: string): Promise<string> {
    const srcPath = path.join(tmpDir, 'out/main.js');
    const mapPath = srcPath + '.map';
    const clojureCode = '(ns paws.code)\n(enable-console-print!)\n' + src;
    return fs.mkdir(`${tmpDir}/src`)
      .then(() => fs.mkdir(`${tmpDir}/src/paws`))
      .then(() => fs.writeFile(`${tmpDir}/src/paws/code.cljs`, clojureCode))
      .then(() => fs.copy(clj, `${tmpDir}/project.clj`))
      .then(() => utils.exec('lein cljsbuild once', tmpDir))
      .then(() => utils.inlineSourceMapFile(srcPath, mapPath));
  }
}