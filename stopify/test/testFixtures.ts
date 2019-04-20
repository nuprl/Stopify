import * as fs from 'fs';
import * as path from 'path';
import * as tmp from 'tmp';
import * as glob from 'glob';
import { execSync } from 'child_process';
import * as stopify from '../src/entrypoints/compiler';
import * as assert from 'assert';

export {
  unitTests,
  intTests,
  deepTests,
  browserTest,
}

const unitTests = glob.sync('test/should-run/*.js', {})
const intTests = glob.sync('test/should-run/source-language/*.js', {})
const deepTests = glob.sync('test/deep-stacks/*.js', {});

function browserTest(srcPath: string, transform: string) {
  const testName = `${srcPath} (${transform}) (in-browser)`;
  const basename = path.basename(srcPath, '.js')

  if (srcPath.endsWith('forever.js')) {
    test(`${testName} (may run forever)`, () => {
      const { name: dstPath } = tmp.fileSync({ dir: ".", postfix: `${basename}.js` });
      execSync(`./bin/compile --transform ${transform} ${srcPath} ${dstPath}`);
      execSync(`./bin/browser chrome ${dstPath} --estimator=countdown -y 1 --stop 5`);
      execSync(`./bin/browser firefox ${dstPath} --estimator=countdown -y 1 --stop 5`);
      fs.unlinkSync(dstPath);
    });
  }
  else {
    it(testName, () => {
      const { name: dstPath } = tmp.fileSync({ dir: ".", postfix: `${basename}.js` });
      execSync(`./bin/compile --transform ${transform} ${srcPath} ${dstPath}`);
      execSync(`./bin/browser chrome ${dstPath} --estimator=countdown --yield 1000 `);
      execSync(`./bin/browser firefox ${dstPath} --estimator=countdown --yield 1000`);
      fs.unlinkSync(dstPath);
    });
  }
}


function setupGlobals(runner: stopify.AsyncRun & stopify.AsyncEval) {
  var globals: any = {
      assert: assert,
      require: function(str: string) {
          if (str === 'assert') {
              return assert;
          }
          else {
              throw 'unknown library';
          }
      },
      Math: Math,
      Number: Number,
      String: String,
      WeakMap: WeakMap, // TODO(arjun): We rely on this for tests?!
      console: console,
      Array: Array,
      Object: Object
  };
  runner.g = globals;
}

export function harness(code: string,
  compilerOpts: Partial<stopify.CompilerOpts> = { },
  runtimeOpts: Partial<stopify.RuntimeOpts> = {
      yieldInterval: 1,
      estimator: 'countdown'
  }) {
  const runner = stopify.stopifyLocally(code, compilerOpts, runtimeOpts);
  if (runner.kind === 'error') {
      throw runner.exception;
  }
  setupGlobals(runner);
  return runner;
}