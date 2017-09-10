import * as assert from 'assert';
import * as fs from 'fs';
import * as tmp from 'tmp';
import * as path from 'path';
const browserify = require('browserify');
const streamToString = require('stream-to-string');
import { spawn, execSync } from 'child_process';

/**
 * Simple wrapper around child_process.execSync. We need to use 'bash'
 * and not 'sh' for directory comprehensions (or whatever they are called).
 */
function exec(cmd: string) {
  return execSync(cmd, { stdio: 'inherit', shell: '/bin/bash' });
}

/** Executes thunk only if path does not exist. */
function creates(path: string, thunk: (path: string) => void): void {
  if (fs.existsSync(path)) {
    return;
  }
  thunk(path);
}

/**
 * Wrapper for spawm that (1) runs the command in the given directory,
 * (2) closes standard input.
 */
export function makeSpawn(wd: string) {
  const opts = {
    stdio: ['ignore', process.stdout, process.stderr],
    cwd: wd
  };
  return function(command: string, ...args: string[]) {
    return spawn(command, args || [], opts);
  };
}

/**
 * Wrapper to compile a single js source with our callcc implementation, then
 * webpack the stopify runtime along with the compiled source.
 * `src` is expected to be an absolute path to the compiler output in a tmp dir
 */
export function runStopify(src: string,
  jsReceiver: (code: string) => any): (exitCode: number) => void {
    return function (exitCode: number): void {
      assert(exitCode === 0);
      tmp.tmpName({ dir: path.dirname(src) }, (err, tmpPath) => {
        creates(tmpPath + '.js', () =>
          exec(`./bin/compile --transform lazy --new wrapper ${src} ${tmpPath}.js`));
        creates(tmpPath + '.html', () =>
          exec(`./bin/webpack ${tmpPath}.js ${tmpPath}.html`));
        const str = fs.readFileSync(tmpPath + '.html', 'utf-8');
        const outFile = path.basename(tmpPath);
        fs.writeFileSync(`./built/demo-webpage/html/${outFile}.html`, str);
        jsReceiver(outFile + '.html');
      });
    };
  }

/**
 * Wrapper to browserify single source file output by compiler toolchains.
 * `src` is expected to be an absolute path to the compiler output in a tmp dir
 */
export function runBrowserify(src: string,
  jsReceiver: (code: string) => any): (exitCode: number) => void {
    return function (exitCode: number): void {
      assert(exitCode === 0);
      const outJs = browserify(src, { debug: true }).bundle();
      streamToString(outJs, 'utf8', (err: any, str: string) => {
        jsReceiver(str);
      });
    };
  }
