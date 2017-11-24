import * as fs from 'fs-extra';
import * as path from 'path';
import * as request from 'request-promise-native';
import { tmpFile, exec } from './misc';

// Download the PyJS runtime system from here
const rtsUrl = 'https://storage.googleapis.com/stopify/pyjs_prelude.js';

// Assumes that the current directory is where we should download the runtime.
const rtsPath = 'pyjs_rts.js';

/** Ensures that PyJS is ready to compile. */
export function init(): Promise<void> {
  return fs.pathExists(rtsPath)
    .then(rtsExists => {
      if (!rtsExists) {
        return request.get(rtsUrl)
          .then((body: string) => fs.writeFile(rtsPath, body));
      }
      else {
        return Promise.resolve(undefined);
      }
    });
}

export function compile(code: string): Promise<string> {
  return tmpFile('.py')
    .then(pyPath => fs.writeFile(pyPath, code)
      .then(_ => exec(`pyjscompile ${pyPath}`))
      .then(jsCode => fs.readFile(rtsPath, 'utf-8')
        .then(rts => fs.unlink(pyPath)
          .then(_ => rts + jsCode + 'pygwtOnLoad();'))));
}