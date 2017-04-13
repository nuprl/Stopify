/**
 * Module to desugar labeled statements into try catches.
 *
 * A label statement turns into a try catch block that catches a
 * corresponding named block on a break.
 *
 */

const t = require('babel-types');
const g = require('babel-generator');

// Object containing the visitor functions
const visitor = {};

visitor.ContinueStatement = function (path) {
  const loopParent = path.findParent(p => p.isWhileStatement());
  const continueLabel = loopParent.node.continue_label

  const breakStatement = t.breakStatement(continueLabel);
  path.replaceWith(breakStatement);
}

visitor.BreakStatement = function (path) {
  const label = path.node.label;
  if (label === null) {
    const labeledParent =
      path.findParent(p => p.isWhileStatement() || p.isSwitchStatement());

    if (labeledParent === null) {
      throw new Error(
        `Parent of ${labelParent.type} wasn't a labeledStatement`);
    }

    path.node.label = labeledParent.node.break_label;
  }
};

// TODO(rachit): Move this into a separate pass for desugaring switch statements
visitor.SwitchStatement = function (path) {
  if (t.isLabeledStatement(path.parent)) return;

  const breakLabel = path.scope.generateUidIdentifier('switch');
  path.node.break_label = breakLabel;
  const labeledStatement = t.labeledStatement(breakLabel, path.node);
  path.replaceWith(labeledStatement);
};

/* visitor.LabeledStatement = function LabeledStatement(path) {
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
};*/


module.exports = function transform(babel) {
  return { visitor };
};
