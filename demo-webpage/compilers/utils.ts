import * as assert from 'assert';
import * as fs from 'fs';
import * as tmp from 'tmp';
import * as path from 'path';
const browserify = require('browserify');
import { spawn, execSync } from 'child_process';
import { SourceMapConsumer } from 'source-map';
import * as smc from 'convert-source-map';

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
export function runStopify(src: string, opts: any,
  jsReceiver: (code: string) => any): (exitCode: number) => void {
    return function (exitCode: number): void {
      assert(exitCode === 0);
      tmp.tmpName({ dir: path.dirname(src) }, (err, tmpPath) => {
        creates(tmpPath + '.js', () =>
          exec(`./bin/compile --transform ${opts.transform} --new ${opts.new} --debug --webpack ${src} ${tmpPath}.js`));
        const str = fs.readFileSync(tmpPath + '.js', 'utf-8');
        const outFile = path.basename(tmpPath);
        fs.writeFileSync(`./dist/${outFile}.js`, str);
        return jsReceiver(outFile + '.js');
      });
    };
  }

/**
 * Given a source-map file at `mapPath`, parse it, generate an inline sourcemap
 * string, and append it to the end of `srcPath`.
 */
export function inlineSourceMapFile(srcPath: string, mapPath: string, cb: () => any): (exitCode: number) => void {
  return function (exitCode: number): void {
    const mapConverter = smc.fromMapFileComment(`//# sourceMappingURL=${mapPath}`, path.dirname(mapPath))!;
    const inline = mapConverter.toComment();
    let src = fs.readFileSync(srcPath, 'utf-8');
    src = smc.removeMapFileComments(src);
    fs.writeFileSync(srcPath, src, 'utf-8');
    fs.appendFileSync(srcPath, inline, 'utf-8');
    return cb();
  }
}
