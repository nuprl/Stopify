// Use this file to document all the constraints on JS--.
const t = require('babel-types');

const visitor = {};

// Only while loops.
visitor.Loop = function Loop(path) {
  if (t.isWhileStatement(path.node) === false) {
    throw new Error(`Resulting code has ${path.node.type}`);
  }
};

// No switch-case constructs.
visitor['SwitchStatement|SwitchCase'] = function (path) {
  throw new Error(`Resulting code has ${path.node.type}`);
};

// No logical expressions.
visitor.LogicalExpression = function (path) {
  throw new Error(`Resulting code has ${path.node.type}`);
};

module.exports = function transform(babel) {
  return { visitor };
};
