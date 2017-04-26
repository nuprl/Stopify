#!/usr/bin/env node
const assert = require('assert');
import * as fs from 'fs';
import * as babel from 'babel-core';

// Desugaring transforms.
import * as noArrows from 'babel-plugin-transform-es2015-arrow-functions';
import * as desugarLoop from './src/desugarLoop';
import * as desugarLabel from './src/desugarLabel';
import * as desugarAndOr from './src/desugarAndOr';
import * as desugarWhileToFunc from './src/desugarLoopToFunc';

// Call Expression naming transform.
import * as anf from './src/anf';

// CPS transforms.
import * as addKArg from './src/addContinuationArg';
import * as cpsVisitor from './src/cpsVisitor';
import * as kApply from './src/applyContinuation';
import * as applyStop from './src/stoppableApply';

// Yield transform.
import * as yieldPass from './src/yield';

// Verification transform.
import * as cpsVerifier from './src/verifiers/cpsVerifier';
import * as desugarVerifier from './src/verifiers/desugarVerifier';
import * as noEvalVerifier from './src/verifiers/noEvalVerifier';

// Helpers
import * as h from './src/helpers';
import {Stoppable} from './src/stopifyInterface';
import {cpsStopify} from './src/stopifyCPSEval';

const desugarPasses = [
  noArrows, desugarLoop, desugarWhileToFunc, desugarLabel, desugarAndOr
];
const yp = [yieldPass];
const preCPS = [anf, addKArg];
const cps = [cpsVisitor];
const defaults = [
  [noEvalVerifier], desugarPasses, preCPS, cps, [kApply], [desugarVerifier]
];

function transform(src, plugs) {
    return h.transform(src, plugs);
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
    let plugs = str.substring(str.indexOf('['), str.lastIndexOf(']') + 1);
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
const output = process.argv[3];

// read the code from this file
fs.readFile(fileName, (err, data) => {
  if (err) throw err;
  const src = data.toString();

  const plugsObj = parsePlugins(src);
  const str = transform(src, plugsObj.arr);
//  const stoppableEval = stopify(src);

  if (output === '--eval') {
    // eval the transformed code. Tests are assumed to contain an assert on
    // testing the output.
    console.log(eval(str));
  } else if (output === '--print' || output === undefined) {
    // print the generated code to screen
    console.log(str);
  }
});
