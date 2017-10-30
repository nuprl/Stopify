import * as fs from 'fs-extra';
import * as path from 'path';
import { JavaScriptInterface } from './compiler';

export let JavaScript : JavaScriptInterface = {
  compile(tmpDir: string, code: string): Promise<string> {
  return fs.writeFile(path.join(tmpDir, 'main.js'), code)
    .then(() => fs.copy(__dirname + '/../../data/webpack.config.js',
                        tmpDir + '/webpack.config.js'))
    .then(() => path.join(tmpDir, 'main.js'));
  }
}
