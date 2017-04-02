const assert = require('assert');
const babel = require('babel-core');

// All the plugins
const noArrows = require('babel-plugin-transform-es2015-arrow-functions');
const desugarLoop = require('../src/desugarLoop.js');
const desugarLabel = require('../src/desugarLabel.js');
const desugarAndOr = require('../src/desugarAndOr.js');
const anf = require('../src/anf.js');
const cps = require('../src/callccPass1.js');
const verifier = require('../src/verifier.js');

module.exports = { transformTest, retainValueTest };

// Make sure all transformers are included here.
const defaults = [noArrows, desugarLoop,
  desugarLabel, desugarAndOr, anf, cps, verifier];

function transform(src, plugs) {
  const out = babel.transform(src, {
    plugins: [...plugs],
    babelrc: false,
  });

  return out.code;
}

// Returns a list of plugins specified on the top of the test file.
// To specify a plugin, add a comment of the form:
// `/* plugins: [p1, p2] /*` where p1, p2 etc. correspond directly to
// the variable names in this file.
// Returns an array of variable names.
function parsePlugins(code) {
  const reg = /\/\*.*\*\//;
  const line = reg.exec(code);
  // No match
  if (line === null) {
    return { str: '', arr: [] };
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

function transformTest(original) {
  let errorMessage = '';
  let transformed = '';
  const plugsObj = parsePlugins(original);
  const plugs = plugsObj.arr === [] ? defaults : plugsObj.arr;

  try {
    transformed = transform(original, plugs);
  } catch (e) {
    errorMessage = e.message;
  }

  const pass = errorMessage.length === 0;
  assert(pass, `Failed to transform with ${plugsObj.str} : ${errorMessage}`);

  return transformed;
}

function retainValueTest(org) {
  const te = eval(transformTest(org));
  const oe = eval(org);
  const pass = te === oe;
  const plugsObj = parsePlugins(org);

  assert(pass,
    `Failed with ${plugsObj.str} original evals to '${oe}' while transformed evals to '${te}'`);
}
