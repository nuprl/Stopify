import * as path from 'path';
import * as fs from 'fs-extra';
import { tmpDir, exec, inlineSourceMapFile } from './misc';

const clj = `${__dirname}/../resources/project.clj`;

export async function compile(src: string): Promise<string> {
  const dir = await tmpDir();
  try {
    const srcPath = path.join(dir, 'out/main.js');
    const mapPath = srcPath + '.map';
    const clojureCode = '(ns paws.code)\n(enable-console-print!)\n' + src;

    await fs.mkdir(`${dir}/src`);
    await fs.mkdir(`${dir}/src/paws`);
    await fs.writeFile(`${dir}/src/paws/code.cljs`, clojureCode);
    await fs.copy(clj, `${dir}/project.clj`);
    await exec('lein cljsbuild once', dir);
    await inlineSourceMapFile(srcPath, mapPath);
    return fs.readFile(srcPath, 'utf-8');
  }
  finally {
    await fs.remove(dir);
  }
}