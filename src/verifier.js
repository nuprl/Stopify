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

visitor.BreakStatement = function (path) {
  if (path.node.label === null) {
    throw new Error('Break statement does not have a target');
  }
};

module.exports = function transform(babel) {
  return { visitor };
};
