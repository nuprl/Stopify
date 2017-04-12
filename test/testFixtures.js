const assert = require('assert');
const babel = require('babel-core');
const fs = require('fs');
const path = require('path');

// All the plugins
const noArrows = require('babel-plugin-transform-es2015-arrow-functions');
const desugarLoop = require('../src/desugarLoop.js');
const desugarLabel = require('../src/desugarLabel.js');
const desugarAndOr = require('../src/desugarAndOr.js');
const anf = require('../src/anf.js');
const addKArg = require('../src/addContinuationArg.js');
const cpsVisitor = require('../src/cpsVisitor.js');
const verifier = require('../src/verifier.js');

module.exports = { transformTest, retainValueTest, walkSync };

// Make sure all transformers are included here.
const defaults = [
  [noArrows, desugarLoop, desugarLabel, desugarAndOr],
  [anf],
  [addKArg, cpsVisitor, verifier]
];

function transform(src, plugs) {
  let { code, ast } = babel.transform(src, { babelrc: false });
  plugs.forEach(trs => {
      const res = babel.transformFromAst(ast, code, {
        plugins: [...trs],
        babelrc: false,
      });
      code = res.code;
      ast = res.ast;
  });

  return code;
}

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {

    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));

  });
  return filelist;
}

function transformTest(original) {
  let errorMessage = '';
  let transformed = '';

  try {
    transformed = transform(original, defaults);
  } catch (e) {
    errorMessage = e.message;
  }

  const pass = errorMessage.length === 0;
  assert(pass, `Failed to transform: ${errorMessage.substr(0, 200)}`);

  return transformed;
}

function retainValueTest(org) {
  let te, oe, pass;
  try {
    te = eval(transformTest(org));
  } catch(e) {
    assert(false, `Failed to eval transformed code: ${e.message}`)
  }

  oe = eval(org);
  pass = te === oe;
  assert(pass,
    `Failed: original evals to '${oe}' while transformed evals to '${te}'`);
}
