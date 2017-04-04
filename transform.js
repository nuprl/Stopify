#!/usr/local/bin/node
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

function transform(src) {
  let code = src;
  defaults.forEach(tr => {
    code = babel.transform(code, {
      plugins: [tr],
      babelrc: false,
    }).code
  })

  return code;
}
// read the filename from the command line arguments
const fileName = process.argv[2];

// read the code from this file
fs.readFile(fileName, (err, data) => {
  if (err) throw err;
  const src = data.toString();

  const str = transform(src);

  // print the generated code to screen
  console.log(str);
});
