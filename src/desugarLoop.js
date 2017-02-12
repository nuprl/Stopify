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

function letExpression(name, value) {
  return t.variableDeclaration('const',
          [t.variableDeclarator(name, value)]);
}


// Object containing the visitor functions
const visitor = {};

// Convert For Statements into While Statements
visitor.ForStatement = function ForStatement(path) {
  const node = path.node;
  const init = node.init;
  const test = node.test;
  const update = node.update;
  const wBody = node.body;

  // New body is a the old body with the update appended to the end.
  let nBody;
  if (update === null) {
    nBody = wBody;
  } else if (t.isBlockStatement(wBody)) {
    wBody.body.push(update);
    nBody = wBody;
  } else {
    nBody = t.BlockStatement([wBody, update]);
  }
  const wl = t.whileStatement(test, nBody);

  // The init can either be a variable declaration or an expression
  let nInit;
  if (init === null) {
    nInit = undefined;
  } else if (t.isExpression(init)) {
    nInit = t.expressionStatement(init);
  } else {
    nInit = init;
  }

  // for loops can leave out init
  if (nInit !== undefined) path.replaceWith(t.blockStatement([nInit, wl]));
  else path.replaceWith(t.blockStatement([wl]));
};

// Convert do-while statements into while statements.
visitor.DoWhileStatement = function DoWhileStatement(path) {
  const node = path.node;
  const doWhileBody = node.body;
  const test = node.test;

  // TODO Write the travesal for transformation body's breaks and continues.
  /**
   * Since the body can contain a break or a continue statement, we need
   * to do the following:
   *
   * 1. Create a function containing the body. The function returns a boolean
   *    signalling whether a break was called.
   * 2. Inside the function, replace all instances of break with return true
   *    and continue with return false.
   * 3. Make sure that the replacer doesn't affect nested loops.
   * 4. Run the while loop if break was not called inside the function body.
   * 5. Inside the while loop, if the function returns true, exit out of
   *    the loop.
   */
  let nBody;
  if (t.isBlockStatement(doWhileBody)) {
    nBody = doWhileBody;
  } else {
    nBody = t.BlockStatements([doWhileBody]);
  }

  const funName = path.scope.generateUidIdentifier('doWhileBody');
  // Modify the function body
  const funExpr = t.functionExpression(null, [], nBody);
  const funDecl = letExpression(funName, funExpr);

  const callExpr = t.callExpression(funName, []);
  const callResName = path.scope.generateUidIdentifier('didBreak');
  // Capture the result of calling the body function.
  const callResult = letExpression(callResName, callExpr);

  // For the body of the while loop, if the result of calling body is
  // true, then break.
  const whileBody = t.blockStatement([
    callResult,
    t.ifStatement(callResName, t.breakStatement()),
  ]);
  const whileLoop = t.whileStatement(test, whileBody);

  // If the result of call the first iteration is not true, run the while loop.
  const conditionalRun = t.ifStatement(
      t.unaryExpression('!', callResName),
      t.blockStatement([whileLoop]), null);

  path.replaceWith(t.BlockStatement([funDecl, callResult, conditionalRun]));
};

visitor.WhileStatement = function WhileStatement(path) {
  const body = path.node.body;

  // If the body of a loop is an expression, convert it
  // into a block statement.
  if (t.isExpressionStatement(body)) {
    const nbody = t.BlockStatement([body]);
    path.node.body = nbody;
  }
};

module.exports = function transform(babel) {
  return { visitor };
};
