/**
 * Module to desugar early-escaping && and || operators.
 */

const t = require('babel-types');
//
// Object containing the visitor functions
const visitor = {};

visitor.LogicalExpression = function (path) {
  const node = path.node;
  const { left, operator, right } = node;

  const desugared = [];
  const tmp = path.scope.generateUidIdentifier('t');
  const test = t.sequenceExpression([
    t.assignmentExpression('=', tmp, left),
    tmp]);
  const trueBranch = t.assignmentExpression('=', tmp, operator === '&&' ? right : left);
  const falseBranch = t.assignmentExpression('=', tmp, operator === '&&' ? left : right);

  desugared.push(t.variableDeclaration('let', [t.variableDeclarator(tmp)]));
  desugared.push(t.ifStatement(test,
        t.expressionStatement(trueBranch),
        t.expressionStatement(falseBranch)));

  path.replaceWithMultiple(desugared);
};

module.exports = function transform(babel) {
  return { visitor };
};
