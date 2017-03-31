/**
 * Module to desugar arrow function expressions (arguments => body) into
 * unnamed function expressions.
 */

const t = require('babel-types');

const visitor = {};

visitor.ArrowFunctionExpression = function (path) {
  const { expression, params, body } = path.node;

  if (expression) {
    // Wrap implicit return in explicit return block statement
    const func = t.functionExpression(null, params,
                    t.blockStatement([t.returnStatement(body)]));
    path.replaceWith(func);
  } else {
    // Any returns are already explicit
    const func = t.functionExpression(null, params, body);
    path.replaceWith(func);
  }
};

module.exports = function transform(babel) {
  return { visitor };
};
