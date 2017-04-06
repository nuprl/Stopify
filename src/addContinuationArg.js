/**
 * Plugin to prepend continuation argument to function params
 */

const t = require('babel-types');
const h = require('./helpers.js');

const visitor = {};

visitor['FunctionDeclaration|FunctionExpression'] = function (path) {
  const k = path.scope.generateUidIdentifier('k');
  path.node.params = [k, ...path.node.params];
};

visitor.ReturnStatement = function (path) {
  const functionParent = path.findParent(x => x.isFunction());
  path.node.kArg = functionParent.node.params[0];
};

module.exports = function transform(babel) {
  return { visitor };
};
