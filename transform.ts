#!/usr/bin/env node
const fs = require('fs');
import * as babel from 'babel-core';

// Desugaring transforms.
const noArrows = require('babel-plugin-transform-es2015-arrow-functions');
import * as desugarLoop from './src/desugarLoop.js';
import * as desugarLabel from './src/desugarLabel.js';
import * as desugarAndOr from './src/desugarAndOr.js';

// Call Expression naming transform.
import * as anf from './src/anf.js';

// CPS transforms.
import * as addKArg from './src/addContinuationArg.js';
import * as cps from './src/cpsVisitor';
import * as kApply from './src/applyContinuation.js';
import * as applyStop from './src/stoppableApply.js';

// Yield transform.
import * as yieldPass from './src/yield.js';
//const yieldPass = require('./src/yield.js');

// Tail yield transform
import * as tailYieldPass from './src/tail_yield.js';

// Verification transform.
import * as verifier from './src/verifier.js';

const defaults = [anf, addKArg, cps];

function transform(src, plugs) {
  let { code, ast } = babel.transform(src, { babelrc: false });
  plugs.forEach(tr => {
    const res = babel.transformFromAst(ast, code, {
      plugins: [tr],
      babelrc: false,
    });
    code = res.code;
    ast = res.ast;
  });

  return code;
}

/*
 * Returns a list of plugins specified on the top of the test file.
 * To specify a plugin, add a comment of the form:
 * `/* plugins: [p1, p2] /*` where p1, p2 etc. correspond directly to
 * the variable names in this file.
 * Returns an array of variable names.
 */
function parsePlugins(code) {
  const reg = /\/\* plugins:.*\*\//;
  const line = reg.exec(code);
  // No match
  if (line === null) {
    return { str: '', arr: defaults };
  } else {
    const str = line[0];
    const plugs = str.substring(str.indexOf('['), str.indexOf(']') + 1);
    if (plugs.charAt(0) !== '[') {
      throw new Error(`Malformed plugin string: ${str}`);
    }
    // This relies on all the plugin variables to be defined by now. Make
    // sure that they are global are defined at the very top of this file.
    return { str: plugs, arr: eval(plugs) };
  }
}

// read the filename from the command line arguments
const fileName = process.argv[2];

// read the code from this file
fs.readFile(fileName, (err, data) => {
  if (err) throw err;
  const src = data.toString();

  const plugsObj = parsePlugins(src);
  const str = transform(src, plugsObj.arr);

  // print the generated code to screen
  console.log(str);
});
