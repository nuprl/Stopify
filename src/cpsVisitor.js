/**
 * Plugin to transform JS programs into CPS form.
 */

const t = require('babel-types');
const g = require('babel-generator');
const h = require('./helpers.js');

const visitor = {};

// Hack to avoid applying visitors to newly constructed nodes.
function isCPS(node) {
  return node.cps;
}

// Wrap whole programs in a function expected a top-level continuation
// argument. To evaluate a program, apply this function to the identity
// continuation.
visitor.Program = function (path) {
  const { body } = path.node;

  const prog = path.scope.generateUidIdentifier('prog');
  const kArg = path.scope.generateUidIdentifier('k');
  const nbody = t.functionDeclaration(prog, [kArg], t.blockStatement(body));

  const x = path.scope.generateUidIdentifier('x');
  const idRet = t.returnStatement(x);
  idRet.cps = true;
  const idCont = t.functionExpression(null, [x], t.blockStatement([idRet]));
  idCont.cps = true;
  const progEval = t.callExpression(prog, [idCont]);
  progEval.cps = true;
  const napp = t.expressionStatement(progEval);

  path.node.body = [nbody, napp];
};

visitor.Function = {
  exit(path) {
    if (isCPS(path.node)) return;

    const { params, body } = path.node;
    const kArg = params[0];

    if (body.body.find(t.isReturnStatement) !== undefined) return;

    let returnIdx = body.body.findIndex(x => t.isExpressionStatement(x) && t.isFunctionExpression(x.expression));
    if (returnIdx === -1) {
      returnIdx = body.body.length - 1;
    }

    if (body.body[returnIdx].expression.callK === true) {
      const returnCall = t.callExpression(body.body[returnIdx].expression, [kArg]);
      returnCall.cps = true;
      const nreturn = t.returnStatement(returnCall);
      nreturn.cps = true;
      body.body[returnIdx] = nreturn;
    }
  },
};

visitor.VariableDeclarator = function (path) {
  const { id, init } = path.node;

  if (t.isCallExpression(init)) {
    const stmtParent = path.getStatementParent();
    const thisPath = stmtParent.key;
    const sibs = stmtParent.container;

    // The continuation of an application is everything after it.
    const afterSibs = sibs.slice(thisPath + 1);

    const kont = t.functionExpression(null, [id], t.blockStatement(afterSibs));

    // Remove the siblings that were wrapped into continuation.
    for (let i = 0; i < afterSibs.length; i += 1) {
      stmtParent.container.pop();
    }

    const callExp = t.callExpression(init.callee, [kont, ...init.arguments]);
    callExp.cps = true;
    const callReturn = t.returnStatement(callExp);
    callReturn.cps = true;
    stmtParent.replaceWith(callReturn);
  }
};

visitor.ReturnStatement = function (path) {
  if (isCPS(path.node)) return;

  const stmtParent = path.getStatementParent();
  const thisPath = stmtParent.key;
  const sibs = stmtParent.container;

  const afterSibs = sibs.slice(thisPath + 1);

  for (let i = 0; i < afterSibs.length; i += 1) {
    stmtParent.container.pop();
  }

  const continuationArg = path.node.kArg;
  // Return statements turn into function expressions. The visitor for
  // function bodies will replace this new node with a return statement
  // of this function's application to the enclosing continuation.
  const returnCall = t.callExpression(continuationArg, [path.node.argument]);
  returnCall.cps = true;
  const ret = t.returnStatement(returnCall);
  ret.cps = true;

  const returnK = path.scope.generateUidIdentifier('rk');
  const returnFunction = t.functionExpression(null,
          [returnK],
          t.blockStatement([ret, ...afterSibs]));
  returnFunction.callK = true;
  path.replaceWith(t.expressionStatement(returnFunction));
};

visitor.IfStatement = {
  exit(path) {
    if (isCPS(path.node)) return;

    let { test, consequent, alternate } = path.node;
    if (t.isBlockStatement(consequent) && consequent.body.length === 1) {
      consequent = consequent.body[0];
    }
    if (t.isBlockStatement(alternate) && alternate.body.length === 1) {
      alternate = alternate.body[0];
    }

    const k = path.scope.generateUidIdentifier('k');

    if (t.isFunctionExpression(consequent.expression)) {
      path.node.consequent = t.returnStatement(t.callExpression(consequent.expression, [k]));
      path.node.consequent.cps = true;
      path.node.consequent.argument.cps = true;
    }
    if (alternate !== null && t.isFunctionExpression(alternate.expression)) {
      path.node.alternate = t.returnStatement(t.callExpression(alternate.expression, [k]));
      path.node.alternate.cps = true;
      path.node.alternate.argument.cps = true;
    }

    path.node.cps = true;
    const continuationBody = t.blockStatement([path.node]);
    const ifFunction = t.functionExpression(null, [k], continuationBody);
    ifFunction.cps = true;
    ifFunction.callK = true;
    const functionCont = path.findParent(x => x.isFunction()).node.params[0];
    const ifContinuation = t.expressionStatement(ifFunction);

    path.replaceWith(ifContinuation);
  },
};

module.exports = function transform(babel) {
  return { visitor };
};
