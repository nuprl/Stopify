import * as path from 'path';
import * as fs from 'fs-extra';
import { tmpDir, exec, inlineSourceMapFile } from './misc';

export async function compile(src: string): Promise<string> {
  const dir = await tmpDir();
  try {
    const dartSrcPath = `${dir}/main.dart`;
    await fs.writeFile(dartSrcPath, src);
    await exec(`/usr/lib/dart/bin/dart2js -o main.js ${dartSrcPath}`, dir);
    await inlineSourceMapFile(`${dir}/main.js`, `${dir}/main.js.map`);
    return fs.readFile(`${dir}/main.js`, 'utf-8');
  }
  finally {
    await fs.remove(dir);
  }
}