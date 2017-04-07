#!/usr/bin/env node
const fs = require('fs');
const babel = require('babel-core');

const noArrows = require('babel-plugin-transform-es2015-arrow-functions');
const desugarLoop = require('./src/desugarLoop.js');
const desugarLabel = require('./src/desugarLabel.js');
const desugarAndOr = require('./src/desugarAndOr.js');
const anf = require('./src/anf.js');
const addKArg = require('./src/addContinuationArg.js');
const cpsVisitor = require('./src/cpsVisitor.js');
const cps = require('./src/callccPass1.js');
const verifier = require('./src/verifier.js');

const defaults = [anf, addKArg, cpsVisitor];

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
