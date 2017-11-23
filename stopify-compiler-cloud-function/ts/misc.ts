import * as tmp from 'tmp';
import * as child_process from 'child_process';

tmp.setGracefulCleanup();

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

export function exec(command: string): Promise<string> {
  return new Promise<string>((resolve, reject) =>
    child_process.exec(command, (err, stdout, stderr) => {
        if (err) {
          const msg = `${command} exited with error ${err}\n${stderr}`
          console.error(msg);
          return reject(msg);
        }
        return resolve(stdout);
      }));
}