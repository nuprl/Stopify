import * as helpers from '../src/callcc/helpers';
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
const assert = require('assert');
import CallCC from '../src/callcc/callcc';
const glob = require('glob');
import * as fs from 'fs';
import * as tmp from 'tmp';
import { spawnSync, execSync } from 'child_process';

function check(codeWithCallCC: string) {
  const { code: jsCode  } = babel.transform(codeWithCallCC, {
    babelrc: false,
    plugins: [ [ CallCC, { captureMethod: 'lazy' } ] ]
  });
  const { name: dstPath } = tmp.fileSync({ dir: ".", postfix: ".js" });
  fs.writeFileSync(dstPath, jsCode);
  const { status } = spawnSync("node", ["--harmony_tailcalls", dstPath], { stdio: 'inherit' });
  assert(status == 42);
  fs.unlinkSync(dstPath);
}

describe("Testing call/cc visitor", function() {
  const files = glob.sync("test/callcc/*.js", {});
  files.forEach((path: string) => {
    it.skip(`${path} (call/cc only)`, () => {
      check(fs.readFileSync(path, "utf-8").toString());
    });
  });

});

describe("Testing capture/cc visitor", function() {
  const files = glob.sync("test/continuations/*.js", {});
  files.forEach((path: string) => {
    it.skip(`${path} (call/cc only)`, () => {
      check(fs.readFileSync(path, "utf-8").toString());
    });
  });

});

