/**
 * Plugin to transform JS programs into CPS form.
 */

const t = require('babel-types');
const h = require('./helpers.js');

const visitor = {};

function isCPS(node) {
  return node.cps;
}

visitor.Program = function (path) {
  const { body } = path.node;

  const prog = path.scope.generateUidIdentifier('prog');
  const kArg = path.scope.generateUidIdentifier('k');
  const nbody = t.functionDeclaration(prog, [kArg], t.blockStatement(body));

  path.node.body = [nbody];
};

visitor.FunctionExpression = function (path) {
  const { params, body } = path.node;
};

visitor.CallExpression = function (path) {
  const stmtParent = path.getStatementParent();
  const thisPath = stmtParent.key;
  const sibs = stmtParent.container;

  // The continuation of an application is everything after it.
  const afterSibs = sibs.slice(thisPath + 1);

  if (afterSibs.length !== 0) {
    // Name the continuation as a function.
    const nk = path.scope.generateUidIdentifier('k');

    // The occrances of {@code name} don't need to be replaced since the same
    // name is being used as the param.
    const kont = t.functionExpression(null, [nk], t.blockStatement(afterSibs));
    /*
  } else if (path.findParent(path => path.isFunction()) !== null) {
  } else {
  }*/

    // Remove the siblings that were wrapped into continuation.
    for (let i = thisPath + 1; i < sibs.length; i += 1) {
      stmtParent.container.pop();
    }

    const callExp = t.callExpression(path.node.callee, [kont, ...path.node.arguments]);
    stmtParent.replaceWith(t.returnStatement(callExp));
  }
};

visitor.ReturnStatement = function (path) {
  if (isCPS(path.node)) return;

  const functionParent = path.findParent(path => path.isFunction());
  if (functionParent !== null) {
    const dummyK = path.scope.generateUidIdentifier('dummy');
    const continuationArg = functionParent.node.params[0];
    const returnCont = t.returnStatement(t.callExpression(continuationArg, [path.node.argument]));
    returnCont.cps = true;
    const returnFunction = t.functionExpression(null, [dummyK], t.blockStatement([returnCont]));
    returnFunction.cps = true;
    path.replaceWith(t.expressionStatement(returnFunction));
  }
};

/*
statementVisitor.IfStatement = function (path) {
    console.log(x++);
  if (isCPS(path.node)) return;

  const { test, consequent, alternate } = path.node;

  const k = path.scope.generateUidIdentifier('k');

  console.log(path.node);
  path.node.consequent = t.returnStatement(t.callExpression(consequent.expression, [k]));
  if (alternate !== null) {
    path.node.alternate = t.returnStatement(t.callExpression(alternate.expression, [k]));
  }

  path.node.cps = true;
  const continuationBody = t.blockStatement([path.node]);
  const ifContinuation = t.expressionStatement(t.functionExpression(null, [k], continuationBody));

  path.replaceWith(ifContinuation);
};
*/
module.exports = function transform(babel) {
  return { visitor };
};
