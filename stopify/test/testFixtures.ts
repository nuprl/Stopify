import * as babel from 'babel-core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import * as tmp from 'tmp';
const glob = require('glob');

export const unitTests = glob.sync('test/should-run/*.js', {})
export const intTests = glob.sync('test/should-run/source-language/*.js', {})
export const stopTests = glob.sync('test/should-stop/*.js', {})

export function callCCTest(srcPath: string, transform: string, opts: string = "") {
  const testName = `${srcPath} ${opts} (${transform})`;

  // Skip tests we know we can't handle
  if (path.basename(srcPath).indexOf("eval") === 0) {
    it.skip(testName);
    return;
  }

  it(testName, () => {
    const basename = path.basename(srcPath, '.js')
    const { name: dstPath } =
      tmp.fileSync({ dir: ".", postfix: `${basename}.js` });
    execSync(
      `./bin/compile --require-runtime --js-args=faithful --transform ${transform} ${opts} ${srcPath} ${dstPath}`);
    try {
      execSync(`./bin/run ${dstPath} --transform ${transform} --yield 1`, { timeout: 30000 });
    }
    finally {
      // NOTE(arjun): I wouldn't mind if these were always left around.
      fs.unlinkSync(dstPath);
    }
  });
}

export function browserTest(srcPath: string, transform: string) {
  const testName = `${srcPath} (${transform}) (in-browser)`;
  const basename = path.basename(srcPath, '.js')

  // Skip tests we know we can't handle
  if ( srcPath.indexOf("dart") >= 0 ||
      srcPath.indexOf("ocaml") >= 0) {
    it.skip(testName);
    return;
  }

  if (srcPath.endsWith('forever.js')) {
    test(`${testName} (may run forever)`, () => {
      const { name: dstPath } = tmp.fileSync({ dir: ".", postfix: `${basename}.js` });
      execSync(`./bin/compile --transform ${transform} ${srcPath} ${dstPath}`);
      execSync(`./bin/browser ${dstPath}  --transform ${transform} -y 1 --stop 5 --env chrome`);
      execSync(`./bin/browser ${dstPath}  --transform ${transform} -y 1 --stop 5 --env firefox`);
      fs.unlinkSync(dstPath);
    });
  }
  else {
    it(testName, () => {
      const { name: dstPath } = tmp.fileSync({ dir: ".", postfix: `${basename}.js` });
      execSync(`./bin/compile --transform ${transform} ${srcPath} ${dstPath}`);
      execSync(`./bin/browser ${dstPath}  --transform ${transform} --yield 1000 --env chrome`);
      execSync(`./bin/browser ${dstPath}  --transform ${transform} --yield 1000 --env firefox`);
      fs.unlinkSync(dstPath);
    });
  }
}

export function stopCallCCTest(srcPath: string, transform: string) {
  const testName = `${srcPath} (${transform}) (infinite loop)`;

  // Don't even try this on a non-Linux platform!
  if (os.platform() !== 'linux') {
    it.skip(testName);
    return;
  }

  // Skip tests that we know we can't handle
  if (srcPath.indexOf("eval") >= 0) {
    it.skip(testName);
    return;
  }
  it(testName, () => {
    const { name: dstPath } = tmp.fileSync({ dir: ".", postfix: ".js" });
    execSync(`./bin/compile --require-runtime --transform ${transform} ${srcPath} ${dstPath}`);
    try {
      execSync(`./bin/run ${dstPath} --transform ${transform} --yield 10 --stop 1`, { timeout: 5000 });
    }
    finally {
      // NOTE(arjun): I wouldn't mind if these were always left around.
      fs.unlinkSync(dstPath);
    }
  });
}
