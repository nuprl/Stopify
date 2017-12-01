import * as path from 'path';
import * as fs from 'fs-extra';
import { tmpDir, exec, inlineSourceMapFile } from './misc';

const clj = `${__dirname}/../resources/project.clj`;

export function compile(src: string): Promise<string> {
  return tmpDir()
  .then(tmpDir => {
    const srcPath = path.join(tmpDir, 'out/main.js');
    const mapPath = srcPath + '.map';
    const clojureCode = '(ns paws.code)\n(enable-console-print!)\n' + src;

    return fs.mkdir(`${tmpDir}/src`)
      .then(() => fs.mkdir(`${tmpDir}/src/paws`))
      .then(() => fs.writeFile(`${tmpDir}/src/paws/code.cljs`, clojureCode))
      .then(() => fs.copy(clj, `${tmpDir}/project.clj`))
      .then(() => exec('lein cljsbuild once', tmpDir))
      .then(() => inlineSourceMapFile(srcPath, mapPath))
      .then(() => fs.readFile(srcPath, 'utf-8'))
      .then(jsCode => fs.remove(tmpDir)
        .then(() => jsCode))

  })
}
