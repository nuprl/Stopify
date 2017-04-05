/**
 * Plugin to prepend continuation argument to function params
 */

const t = require('babel-types');

const visitor = {};

visitor['FunctionDeclaration|FunctionExpression'] = function (path) {
  const k = path.scope.generateUidIdentifier('k');
  path.node.params = [k, ...path.node.params];
};

module.exports = function transform(babel) {
  return { visitor };
};
