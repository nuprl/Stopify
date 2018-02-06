import * as fs from 'fs-extra';
import * as path from 'path';
import * as request from 'request-promise-native';
import { tmpDir, exec } from './misc';

const rtsPath = '/root/pyjs_prelude.js';

export async function compile(code: string): Promise<string> {
  const dir = await tmpDir();
  try {
    const pyPath = `${dir}/main.py`
    await fs.writeFile(pyPath, code);
    const jsCode = await exec(`pyjscompile ${pyPath}`);
    const rts = await fs.readFile(rtsPath, 'utf-8');
    return rts.replace('$__R.suspend()', 'null') + jsCode + 'pygwtOnLoad();';
  }
  finally {
    await fs.remove(dir);
  }
}
