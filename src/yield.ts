import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import * as b from 'babylon';
import * as h from './helpers';

interface CallExpression extends t.CallExpression {
  dontTransform: boolean;
};
type Function = t.FunctionDeclaration|t.FunctionExpression;

// Function to run top level callExpressions.
// TODO(rachit): Make the run function check for stopped state.
let runFunc = b.parseExpression(`
  function run(gen, res = { done: false }) {
    if (gen !== undefined && typeof gen.next === 'function') {
      res = gen.next();
      if (res.done) {
        return res.value
      }
      else {
        return run(gen, res)
      }
    } else {
      return gen;
    }
  }
`);
const { id, params, body } = runFunc;
const runFuncName = runFunc.id;

const program : VisitNode<t.Program> = {
  exit : function (path: NodePath<t.Program>): void {
    path.node.body.unshift(runFunc);
  },
};

const callExpression : VisitNode<CallExpression> = function (path: NodePath<CallExpression>): void {
  if (path.node.dontTransform) return;
  if (h.isConsoleLog(path.node.callee)) return;

  if (t.isYieldExpression(path.parent)) return;
  const funcParent = path.findParent(
    p => p.isFunctionExpression() || p.isFunctionDeclaration());

  // Inside another function.
  if (funcParent !== null) {
    const yieldExpr = t.yieldExpression(path.node, true);
    path.replaceWith(yieldExpr);
  } else {
    path.node.dontTransform = true;
    const runExpr = <CallExpression>t.callExpression(runFuncName, [path.node]);
    runExpr.dontTransform = true;
    path.replaceWith(runExpr);
  }
};

const func : VisitNode<Function> = function (path: NodePath<Function>): void {
  // Add a dummy yield at the top of the function to force it to pause.
  const yieldExpr = t.yieldExpression(t.stringLiteral('dummy'), false);
  (<Function>path.node).body.body.unshift(t.expressionStatement(yieldExpr));
  path.node.generator = true;
};

const yieldVisitor: Visitor = {
  Program: program,
  FunctionDeclaration: func,
  FunctionExpression: func,
  CallExpression: callExpression
}

module.exports = function (babel) {
  return { visitor: yieldVisitor };
};
