import * as fs from 'fs-extra';
import * as path from 'path';
import * as request from 'request-promise-native';
import { tmpDir, exec } from './misc';

/**
 * Compiles a Python module using PyJS, but does not link it to the PyJS
 * runtime system. The produced module is called 'main' and the PyJS runtime
 * must be written to load 'main'.
 *
 * @param code body of the python module
 */
export async function compile(code: string): Promise<string> {
  const dir = await tmpDir();
  try {
    await fs.writeFile(`${dir}/main.py`, code);
    return await exec(`pyjscompile main.py`, dir);
  }
  finally {
    await fs.remove(dir);
  }
}
