/**
 * Module to desugar early-escaping && and || operators.
 *
 * Early-escaping logical expressions are transformed into ternary expressions.
 */

const t = require('babel-types');

// Object containing the visitor functions
const visitor = {};

// No Logical Binary Expressions
visitor.LogicalExpression = function (path) {
  const node = path.node;
  const { left, operator, right } = node;

  const tmp = path.scope.generateUidIdentifier('t');
  const test = t.sequenceExpression([
    t.assignmentExpression('=', tmp, left),
    tmp]);
  const trueBranch = t.assignmentExpression('=', tmp,
      operator === '&&' ? right : left);
  const falseBranch = t.assignmentExpression('=', tmp,
      operator === '&&' ? left : right);

  path.getStatementParent().insertBefore(t.variableDeclaration('let',
      [t.variableDeclarator(tmp)]));
  path.replaceWith(t.ifStatement(test,
        t.expressionStatement(trueBranch),
        t.expressionStatement(falseBranch)));
};

module.exports = function transform(babel) {
  return { visitor };
};
