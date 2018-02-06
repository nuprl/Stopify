import * as path from 'path';
import * as fs from 'fs-extra';
import { tmpDir, exec, inlineSourceMapFile } from './misc';

export async function compile(src: string): Promise<string> {
  const dir = await tmpDir();
  try {
    const scalaSrcPath = `${dir}/Main.scala`;
    await fs.writeFile(scalaSrcPath, src);
    await exec(`scalajsc -d . ${scalaSrcPath}`, dir);
    // NOTE(arjun):  scalajsld returns exit code 0 even if the arguments are
    // wrong!
    await exec(`scalajsld -o main.js -mm Runner.main . --sourceMap .`, dir);
    await inlineSourceMapFile(`${dir}/main.js`, (`${dir}/main.js.map`));
    return fs.readFile(`${dir}/main.js`, 'utf-8');
  }
  finally {
    await fs.remove(dir);
  }
}