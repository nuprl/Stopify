/**
 * Module to desugar labeled statements into try catches.
 *
 * A label statement turns into a try catch block that catches a
 * corresponding named block on a break.
 *
 * TODO Figure out what should happen on a continue.
 */

const t = require('babel-types');

// Object containing the visitor functions
const visitor = {};

visitor.BreakStatement = function BreakStatement(path) {
  const name = path.node.label.name;
  path.replaceWith(t.throwStatement(t.stringLiteral(`${name}-label`)));
};

visitor.LabeledStatement = function LabeledStatement(path) {
  const node = path.node;
  const labelName = t.stringLiteral(`${node.label.name}-label`);
  const body = node.body;

  const catchHandler = t.catchClause(t.identifier('e'),
      t.blockStatement([
        t.ifStatement(
          t.binaryExpression('!==', t.identifier('e'), labelName),
          t.throwStatement(t.identifier('e')),
          null)]));

  const tryCatchClause = t.tryStatement(body, catchHandler);
  path.replaceWith(tryCatchClause);
};


module.exports = function transform(babel) {
  return { visitor };
};
