#!/usr/bin/env node
const fs = require('fs');
const babel = require('babel-core');

const noArrows = require('babel-plugin-transform-es2015-arrow-functions');
const desugarLoop = require('./src/desugarLoop.js');
const desugarLabel = require('./src/desugarLabel.js');
const desugarAndOr = require('./src/desugarAndOr.js');
const anf = require('./src/anf.js');
const cps = require('./src/callccPass1.js');
const verifier = require('./src/verifier.js');

const defaults = [noArrows, desugarLoop,
  desugarLabel, desugarAndOr, anf, cps, verifier];

function transform(src, plugs) {
  let code = src;
  plugs.forEach(tr => {
    code = babel.transform(code, {
      plugins: [tr],
      babelrc: false,
    }).code;
  });

  return code;
}

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
