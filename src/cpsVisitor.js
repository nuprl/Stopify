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

  const idCont = t.functionExpression(null, [], t.blockStatement([]));
  const napp = t.expressionStatement(t.callExpression(prog,[idCont]));

  path.node.body = [nbody, napp];
};

visitor.VariableDeclarator = function (path) {
  const { id, init } = path.node;

  if (t.isCallExpression(init)) {
    const stmtParent = path.getStatementParent();
    const thisPath = stmtParent.key;
    const sibs = stmtParent.container;

    // The continuation of an application is everything after it.
    const afterSibs = sibs.slice(thisPath + 1);

    if (afterSibs.length !== 0) {
      const kont = t.functionExpression(null, [id], t.blockStatement(afterSibs));

      // Remove the siblings that were wrapped into continuation.
      for (let i = 0; i < afterSibs.length; i += 1) {
          stmtParent.container.pop();
      }

      const callExp = t.callExpression(init.callee, [kont, ...init.arguments]);
      stmtParent.replaceWith(t.expressionStatement(callExp));
    }
  }
};

visitor.FunctionExpression = function (path) {
  if (isCPS(path.node)) return;

  const { params, body } = path.node;
  const bodyFunc = body.body[0];
};

visitor.CallExpression = function (path) {
  if (isCPS(path.node)) return;

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

    // Remove the siblings that were wrapped into continuation.
    for (let i = thisPath + 1; i < sibs.length; i += 1) {
      stmtParent.container.pop();
    }

    const callExp = t.callExpression(path.node.callee, [kont, ...path.node.arguments]);
    callExp.cps = true;
    stmtParent.replaceWith(t.expressionStatement(callExp));
  }
};

visitor.ReturnStatement = function (path) {
  if (isCPS(path.node)) return;

  const functionParent = path.findParent(path => path.isFunction());
  if (functionParent !== null) {
    // We'd normally construct the continuation for this statement, but return
    // statements apply the continuation of the enclosing function; they would
    // otherwise resume execution on dead code after a return statement.
    const dummyK = path.scope.generateUidIdentifier('dummy');

    // Continuation argument has been prepended to function parameters.
    const returnCont = t.returnStatement(t.callExpression(dummyK, [path.node.argument]));
    returnCont.cps = true;
    const returnFunction = t.functionExpression(null, [dummyK], t.blockStatement([returnCont]));
    returnFunction.cps = true;

    const stmtParent = path.getStatementParent();
    const thisPath = stmtParent.key;
    const sibs = stmtParent.container;

    const continuationArg = sibs[thisPath - 1].declarations[0].init;
    sibs.splice(thisPath - 1, 1);
    // Return statements turn into function expressions. The visitor for
    // function bodies will replace this new node with a return statement
    // of this function's application to the enclosing continuation.
    const returnCall = t.callExpression(returnFunction, [continuationArg]);
    returnCall.cps = true;
    const ret = t.expressionStatement(returnCall);
    ret.cps = true;
    path.replaceWith(ret);
  }
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

        path.node.consequent = t.returnStatement(t.callExpression(consequent.expression, [k]));
        path.node.consequent.cps = true;
        if (alternate !== null) {
            path.node.alternate = t.returnStatement(t.callExpression(alternate.expression, [k]));
            path.node.alternate.cps = true;
        }

        path.node.cps = true;
        const continuationBody = t.blockStatement([path.node]);
        const ifFunction = t.functionExpression(null, [k], continuationBody);
        const functionCont = path.findParent(x => x.isFunction()).node.params[0];
        const ifCall = t.callExpression(ifFunction, [functionCont]);
        ifCall.cps = true;
        const ifContinuation = t.expressionStatement(ifCall);

        path.replaceWith(ifContinuation);
    }
};

module.exports = function transform(babel) {
  return { visitor };
};
