import * as helpers from '../src/common/helpers';
import * as babel from 'babel-core';
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
const assert = require('assert');
import CallCC from '../src/callcc/callcc';
const glob = require('glob');
import * as fs from 'fs';

function check(codeWithCallCC: string) {
  const { code: jsCode  } = babel.transform(codeWithCallCC, {
    babelrc: false,
    plugins: [ [ CallCC, { captureMethod: 'lazyExn' } ] ]
  });
  eval(jsCode!);
}

describe("Testing call/cc visitor", function() {
  const files = glob.sync("test/callcc/*.js", {});
  files.forEach((path: string) => {
    it.skip(`${path} (call/cc only)`, () => {
      check(fs.readFileSync(path, "utf-8").toString());
    });
  });

});
