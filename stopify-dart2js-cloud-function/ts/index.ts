import * as fs from 'fs-extra';
import * as path from 'path';
import { resolve } from 'path';
import * as tmp from 'tmp';
import * as cp from 'child_process';
import { compile } from 'morgan';
import * as smc from 'convert-source-map';

import { Request, Response } from 'express';

export function tmpDir(): Promise<string> {
  return new Promise((resolve, reject) => {
    tmp.dir((err, path) => {
      if (err) {
        return reject(err);
      }
      return resolve(path);
    });
  });
}

const env = Object.assign({ }, process.env);
env.PATH = path.resolve(__dirname, '../dist/bin') + ':' + env.PATH;

function exec(command: string, cwd: string): Promise<string> {
  return new Promise<string>((resolve, reject) =>
    cp.exec(command, { env: env,  cwd: cwd }, (err, stdout, stderr) => {
        if (err) {
          const msg = `${command} exited with error ${err}\n${stderr}`
          console.error(msg);
          return reject(msg);
        }
        return resolve(stdout);
      }));
}

 function inlineSourceMapFile(srcPath: string, mapPath: string): Promise<string> {
  const mapConverter = smc.fromMapFileComment(`//# sourceMappingURL=${mapPath}`, path.dirname(mapPath))!;
  const inline = mapConverter.toComment();
  return fs.readFile(srcPath, 'utf-8')
    .then(src => fs.writeFile(srcPath, smc.removeMapFileComments(src), { encoding: 'utf-8' }))
    .then(() => fs.appendFile(srcPath, inline, { encoding: 'utf-8' }))
    .then(() => srcPath);
}

export function stopifyCompileDart2JS(req: Request, resp: Response) {
  const code = req.body.toString();
  return tmpDir().then(dir => {
    const dartSrcPath = `${dir}/main.dart`;
    return fs.writeFile(dartSrcPath, code)
      .then(() => exec(`dart2js -o main.js ${dartSrcPath}`, dir))
      .then(() => inlineSourceMapFile(`${dir}/main.js`, (`${dir}/main.js.map`)))
      .then(() => fs.readFile(`${dir}/main.js`, 'utf-8'))
      .then(jsCode => resp.send(jsCode));
  })
  .catch(reason => {
    console.error(reason);
    resp.status(500).send(reason);
  });
}