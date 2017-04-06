/**
 * Plugin to transform JS programs into ANF form.
 *
 * WARNING:
 * The plugin assumes that the assumptions stated in ./src/desugarLoop.js
 * hold. The resulting output is not guarenteed to be in ANF form if the
 * assumptions do not hold.
 */

const t = require('babel-types');
const h = require('./helpers.js');

// Object to contain the visitor functions
const visitor = {};

visitor.CallExpression = function (path) {
  const p = path.parent;
  // Name the function application if it is not already named.
  if (t.isVariableDeclarator(p) === false) {
    path.node.anfed = true;
    const name = path.scope.generateUidIdentifier('app');
    const bind = h.letExpression(name, path.node);
    path.getStatementParent().insertBefore(bind);
    path.replaceWith(name);
  }
}

module.exports = function transform(babel) {
  return { visitor };
};
