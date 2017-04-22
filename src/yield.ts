import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import * as b from 'babylon';
import * as h from './helpers';

type Function = t.FunctionDeclaration|t.FunctionExpression;

// Function to run top level callExpressions.
let runFunc = b.parseExpression(`
  function run(gen, res = { done: false }) {
    setTimeout(_ => {
      res = gen.next();
      if (res.done) {
        return res.value
      }
      else {
        return run(gen, res)
      }
    })
  }
`);

let runProg = b.parseExpression(`
run($runProg())
`)

const program : VisitNode<t.Program> = {
  enter: function (path: NodePath<t.Program>): void {
    const prog = path.node.body;
    const func = t.functionDeclaration(
      t.identifier('$runProg'), [], t.blockStatement(prog))
    path.node.body = [func]
  },
  exit: function (path: NodePath<t.Program>): void {
    path.node.body = [runFunc, ...path.node.body, runProg]
  },
};

const callExpression: VisitNode<t.CallExpression> =
  function (path: NodePath<t.CallExpression>): void {
    if (h.isNativeFunction(path.node.callee)) return;
    if (t.isYieldExpression(path.parent)) return;

    const yieldExpr = t.yieldExpression(path.node, true);
    path.replaceWith(yieldExpr);
  };

const func: VisitNode<Function> = function (path: NodePath<Function>): void {
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
