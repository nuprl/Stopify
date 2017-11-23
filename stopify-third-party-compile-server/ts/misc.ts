import * as tmp from 'tmp';
import * as child_process from 'child_process';
import * as smc from 'convert-source-map';
import * as path from 'path';
import * as fs from 'fs-extra';

tmp.setGracefulCleanup();

export function tmpFile(postfix: string): Promise<string> {
  return new Promise((resolve, reject) => {
    tmp.file({ postfix }, (err, path) => {
      if (err) {
        return reject(err);
      }
      return resolve(path);
    });
  });
}

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

export function exec(command: string, wd?: string): Promise<string> {
  const opts = wd ? { cwd: wd } : { };
  return new Promise<string>((resolve, reject) => 
    child_process.exec(command, opts, (err, stdout, stderr) => {
      if (err) {
        const msg = `${command} failed with error ${err}\n${stderr}\n${stdout}`
        console.error(msg);
        return reject(msg);
      }
      return resolve(stdout);
    }));
}

export function inlineSourceMapFile(srcPath: string, mapPath: string): Promise<string> {
  const mapConverter = smc.fromMapFileComment(`//# sourceMappingURL=${mapPath}`, path.dirname(mapPath))!;
  const inline = mapConverter.toComment();
  return fs.readFile(srcPath, 'utf-8')
    .then(src => fs.writeFile(srcPath, smc.removeMapFileComments(src), { encoding: 'utf-8' }))
    .then(() => fs.appendFile(srcPath, inline, { encoding: 'utf-8' }))
    .then(() => srcPath);
}