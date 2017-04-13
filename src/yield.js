const t = require('babel-types');
const b = require('babylon');
const h = require('./helpers');

// Function to run top level callExpressions.
let runFunc = b.parseExpression(`
function run(gen) {
  let it = gen;
  let res = { done: false };
  while (res.done === false) {
    res = it.next();
  };
  res = res.value;
  return res;
}
`)
const { id, params, body } = runFunc;
runFunc = t.functionDeclaration(id, params, body);
const runFuncName = runFunc.id;

const visitor = {};

visitor.Program = {
  exit(path) {
    path.node.body.unshift(runFunc);
  }
}

visitor['FunctionDeclaration|FunctionExpression'] = function (path) {
  // Add a dummy yield at the top of the function to force it to pause.
  const yieldExpr = t.yieldExpression(t.stringLiteral('dummy'), false);
  path.node.body.body.unshift(yieldExpr);
  path.node.generator = true;
}

visitor.CallExpression = function (path) {
  if(path.node.dontTransform) return;
  if(h.isConsoleLog(path.node.callee)) return;

  if(t.isYieldExpression(path.parent)) return;
  const funcParent = path.findParent(
    p => p.isFunctionExpression() || p.isFunctionDeclaration())

  // Inside another function.
  if (funcParent !== null) {
    const yieldExpr = t.yieldExpression(path.node, true)
    path.replaceWith(yieldExpr);
  }
  else {
    path.node.dontTransform = true;
    const runExpr = t.callExpression(runFuncName, [path.node]);
    runExpr.dontTransform = true;
    path.replaceWith(runExpr);
  }
}

module.exports = function transform(babel) {
  return { visitor };
};
