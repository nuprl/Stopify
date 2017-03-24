/**
 * Module to desugar loops into recursive functions. This requires
 * the following transformations to be done:
 *
 * This plugin must enforce the following assumption about loops:
 *
 * Loop bodies are BlockStatements:
 * Loops can have an ExpressionStatement for their body. This messes
 * up the anf pass since it tries to added the complex named expression
 * to the nearest statement. In this case, the statement will be
 * outside the body of the for loop, effectively hoisting them outside
 * the function body. To fix this, the body of all loops should a statement.
 */

const t = require('babel-types');
const h = require('./helpers.js');

function letExpression(name, value, kind) {
  return t.variableDeclaration('const',
          [t.variableDeclarator(name, value)]);
}


// Object containing the visitor functions
const visitor = {};

// Convert For Statements into While Statements
visitor.ForStatement = function ForStatement(path) {
  const node = path.node;
  let { init, test, update, body:wBody } = node

  // New body is a the old body with the update appended to the end.
  if (update === null) {
    update = t.emptyStatement();
  }
  else {
    update = t.expressionStatement(update);
  }
  wBody = h.flatBodyStatement([wBody, update]);

  // Test can be null
  if (test === null) {
    test = t.booleanLiteral(true)
  }
  const wl = t.whileStatement(test, wBody);

  // The init can either be a variable declaration or an expression
  let nInit = t.emptyStatement();
  if (init !== null) {
    nInit = t.isExpression(init) ? t.expressionStatement(init) : init
  }

  path.replaceWith(h.flatBodyStatement([nInit, wl]));
};

// Convert do-while statements into while statements.
visitor.DoWhileStatement = function DoWhileStatement(path) {
  const node = path.node;
  let { test, body } = node;

  // Add flag to run the while loop at least once
  const runOnce = path.scope.generateUidIdentifier("runOnce");
  const runOnceInit = t.variableDeclaration('let',
    [t.variableDeclarator(runOnce, t.booleanLiteral(true))]);
  const runOnceSetFalse =
    t.expressionStatement(
      t.assignmentExpression("=", runOnce, t.booleanLiteral(false)))
  body = h.flatBodyStatement([runOnceSetFalse, body]);

  test = t.logicalExpression("||", runOnce, test);

  path.replaceWith(
    h.flatBodyStatement([runOnceInit, t.whileStatement(test, body)]));

};

module.exports = function transform(babel) {
  return { visitor };
};
