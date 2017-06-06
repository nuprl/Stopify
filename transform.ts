#!/usr/bin/env node
import * as fs from 'fs';
import * as babel from 'babel-core';

// Desugaring transforms.
const noArrows = require('babel-plugin-transform-es2015-arrow-functions');
const desugarLoop = require('./src/desugarLoop');
const desugarLabel = require('./src/desugarLabel');
const desugarAndOr = require('./src/desugarAndOr');
const desugarWhileToFunc = require('./src/desugarLoopToFunc');
const desugarNew = require('./src/desugarNew');

// Call Expression naming transform.
const anf = require('./src/anf');

// CPS transforms.
const addKArg = require('./src/addContinuationArg');
const cpsVisitor = require('./src/cpsSyntax.ts');
const applyStop = require('./src/stoppableApply');

const transformMarked = require('./src/transformMarked');

// Yield transform.
const yieldPass = require('./src/yield');

const markKnown = require('./src/markKnownFunctions')

// Verification transform.
const cpsVerifier = require('./src/verifiers/cpsVerifier');
const desugarVerifier = require('./src/verifiers/desugarVerifier');
const noEvalVerifier = require('./src/verifiers/noEvalVerifier');

// Helpers
import * as h from './src/helpers';

function transform(src: string, plugs: any[]) {
    return h.transform(src, plugs);
}

/*
 * Returns a list of plugins specified on the top of the test file.
 * To specify a plugin, add a comment of the form:
 * `/* plugins: [p1, p2] /*` where p1, p2 etc. correspond directly to
 * the variable names in this file.
 * Returns an array of variable names.
 */
function parsePlugins(code: string) {
  const reg = /\/\* plugins:.*\*\//;
  const line = reg.exec(code);
  // No match
  if (line === null) {
    return { str: '', arr: [] };
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
