import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { parseExpression } from 'babylon';
import { Transformed, transformed, Tag, OptimizeMark } from './helpers'

const runProg = t.expressionStatement(t.callExpression(
  t.identifier('$runYield'), [t.callExpression(t.identifier('$runProg'), [])]))

const program : VisitNode<t.Program> = {
  enter: function (path: NodePath<t.Program>): void {
    const lastLine = <t.Statement>path.node.body.pop();
    if(t.isExpressionStatement(lastLine)) {
      let result = t.returnStatement(lastLine.expression);
      path.node.body.push(result);
    } else {
      path.node.body.push(lastLine)
    }
    const prog = path.node.body;
    const func = t.functionDeclaration(
      t.identifier('$runProg'), [], t.blockStatement(prog))
    path.node.body = [func]
  },
  exit: function (path: NodePath<t.Program>): void {
    path.node.body = [...path.node.body, runProg]
    const { body } = path.node;
    const nBody = []
    for (let i =0; i<body.length; i++) {
      nBody.push(t.expressionStatement(t.yieldExpression(t.numericLiteral(0))));
      nBody.push(body[i]);
    }

    path.node.body = nBody
  },
};

// NOTE(rachit): Assumes that all functions in the call expression are
// identifiers.
const callExpression: VisitNode<OptimizeMark<Transformed<t.CallExpression>>> =
  function (path: NodePath<OptimizeMark<Transformed<t.CallExpression>>>): void {
    const exp = path.node;
    if(exp.isTransformed) return
    else exp.isTransformed = true;

    if (exp.OptimizeMark === 'Untransformed') {
      return;
    }
    else if (exp.OptimizeMark === 'Transformed') {
      path.replaceWith(t.yieldExpression(exp, true))
    }
    else {
      const cond = t.conditionalExpression(
        t.memberExpression(path.node.callee, t.identifier('$isTransformed')),
        t.yieldExpression(path.node, true),
        path.node)
      path.replaceWith(cond);
    }
  };

const block: VisitNode<t.BlockStatement> = function (path: NodePath<t.BlockStatement>): void {
  const { body } = path.node;
  const nBody = []
  for (let i =0; i<body.length; i++) {
    nBody.push(t.expressionStatement(t.yieldExpression(t.numericLiteral(0))));
    nBody.push(body[i]);
  }

  path.node.body = nBody
}

const yieldVisitor: Visitor = {
  BlockStatement: block,
  CallExpression: callExpression,
  Program: program,
}

module.exports = function() {
  return { visitor: yieldVisitor };
};
