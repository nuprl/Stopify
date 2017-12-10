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
