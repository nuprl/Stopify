import * as assert from 'assert';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import * as tmp from 'tmp';
import * as path from 'path';
const browserify = require('browserify');
import * as childProcess from 'child_process';
import { SourceMapConsumer } from 'source-map';
import * as smc from 'convert-source-map';

export function toPromise<T>(
  asyncOp: (callback: (err: any, result: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    asyncOp((err, result) => {
      if (err === null) {
        return resolve(result);
      }
      else {
        return reject(err.toString());
      }
    });
  });
}

export function tmpDir(): Promise<string> {
  return toPromise(cb => tmp.dir(cb));
}

export function tmpName(opts: tmp.SimpleOptions): Promise<string> {
  return toPromise(cb => tmp.tmpName(opts, cb));
}

/**
 * Simple wrapper around child_process.execSync. We need to use 'bash'
 * and not 'sh' for directory comprehensions (or whatever they are called).
 */
export function exec(cmd: string, cwd?: string): Promise<void> {
  // TODO(arjun): shell output
  const opts: childProcess.ExecOptions = { shell: '/bin/bash' };
  if (cwd) {
    opts.cwd = cwd;
  }
  return new Promise<void>((resolve, reject) => {
    childProcess.exec(cmd, opts, (err, stdout, stderr) => {
      if (err === null) {
        return resolve(undefined);
      }
      return reject(stdout + '\n' + stderr);
    });
  });
}

/** Executes thunk only if path does not exist. */
function creates(path: string, thunk: (path: string) => void): void {
  if (fs.existsSync(path)) {
    return;
  }
  thunk(path);
}

/**
 * Wrapper to compile a single js source with our callcc implementation, then
 * webpack the stopify runtime along with the compiled source.
 * `src` is expected to be an absolute path to the compiler output in a tmp dir
 */
export function runStopify(src: string, opts: any): Promise<string> {
  return tmpName({ dir: path.dirname(src), postfix: '.js' })
    .then(tmpPath =>
      exec(`../stopify/bin/compile --transform ${opts.transform} --new ${opts.new} --debug --webpack ${src} ${tmpPath}`)
        .then(() => tmpPath));
}

/**
 * Given a source-map file at `mapPath`, parse it, generate an inline sourcemap
 * string, and append it to the end of `srcPath`.
 */
export function inlineSourceMapFile(srcPath: string, mapPath: string): Promise<string> {
  const mapConverter = smc.fromMapFileComment(`//# sourceMappingURL=${mapPath}`, path.dirname(mapPath))!;
  const inline = mapConverter.toComment();
  return fsExtra.readFile(srcPath, 'utf-8')
    .then(src => fsExtra.writeFile(srcPath, smc.removeMapFileComments(src), { encoding: 'utf-8' }))
    .then(() => fs.appendFile(srcPath, inline, { encoding: 'utf-8' }))
    .then(() => srcPath);
}