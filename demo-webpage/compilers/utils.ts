import * as assert from 'assert';
const browserify = require('browserify');
const streamToString = require('stream-to-string');
import { spawn } from 'child_process';

// Wrapper for spawm that (1) runs the command in the given directory,
// (2) closes standard input.
export function makeSpawn(wd: string) {
  const opts = {
    stdio: ['ignore', process.stdout, process.stderr],
    cwd: wd
  };
  return function(command: string, ...args: string[]) {
    return spawn(command, args || [], opts);
  };
}

// Wrapper to browserify single source file output by compiler toolchains.
// `src` is expected to be an absolute path to the compiler output in a tmp dir
export function runBrowserify(src: string,
  jsReceiver: (code: string) => any): (exitCode: number) => void {
    return function (exitCode: number): void {
      assert(exitCode === 0);
      const outJs = browserify(src).bundle();
      streamToString(outJs, 'utf8', (err: any, str: string) => {
        jsReceiver(str);
      });
    };
  }
