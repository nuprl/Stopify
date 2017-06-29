import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { parseExpression } from 'babylon';
import { Transformed, transformed, Tag, OptimizeMark } from '../common/helpers'

const runProg = t.expressionStatement(t.callExpression(
  t.identifier('$runYield'), [t.callExpression(t.identifier('$runProg'), [])]))

const ifYield = t.ifStatement(
  t.binaryExpression('===',
    t.identifier('$counter'),
    t.identifier('$yieldCounter')
  ),
  t.blockStatement([
    t.expressionStatement(
      t.assignmentExpression('=', t.identifier('$counter'), t.numericLiteral(0))
    ),
    t.expressionStatement(
      t.yieldExpression(t.numericLiteral(0), false)
    )
  ]),
  t.blockStatement([
    t.expressionStatement(
      t.updateExpression('++', t.identifier('$counter'), false)
    )
  ])
)

const program : VisitNode<t.Program> = {
  enter: function (path: NodePath<t.Program>): void {
    const prog = path.node.body;
    const func = t.functionDeclaration(
      t.identifier('$runProg'), [], t.blockStatement(prog))
    path.node.body = [func]
  },
  exit: function (path: NodePath<t.Program>): void {
    path.node.body = [...path.node.body, runProg]
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
    else {
      /*let callee = path.node.callee;
      if (t.isMemberExpression(path.node.callee)) {
        if (t.isIdentifier(path.node.callee.property)) {
          if(path.node.callee.property.name === 'call' ||
            path.node.callee.property.name === 'apply') {
            callee = path.node.callee.object;
          }
        } else if (t.isStringLiteral(path.node.callee.property)) {
          if(path.node.callee.property.value === 'call' ||
            path.node.callee.property.value === 'apply') {
            callee = path.node.callee.object;
          }
        }
      }
      const cond = t.conditionalExpression(
        t.memberExpression(callee, t.identifier('$isTransformed')),
        t.yieldExpression(path.node, true),
        path.node)
      path.replaceWith(cond);*/
      const applyArgs = [path.node.callee, ...path.node.arguments]
      const yieldExpr = t.yieldExpression(
        transformed(
          t.callExpression(
            t.identifier('$apply_wrapper'),
            [transformed(path.node)])),
        true)

      path.replaceWith(yieldExpr)
    }
  };

const loop: VisitNode<Transformed<t.Loop>> = function (path: NodePath<Transformed<t.Loop>>): void {
  if (path.node.isTransformed) return
  if (t.isBlockStatement(path.node.body)) {
    path.node.body.body.unshift(ifYield);
    transformed(path.node)
  } else {
    throw new Error('Body of loop is not a block statement')
  }
}

const func = {
  enter(path: NodePath<t.Function>) {
    if(path.node.generator === false) {
      path.node.generator = true
      transformed(path.node)
    }
  }
}

const yieldVisitor: Visitor = {
  FunctionDeclaration: func,
  FunctionExpression: func,
  CallExpression: callExpression,
  "Loop": loop,
  Program: program,
}

module.exports = function() {
  return { visitor: yieldVisitor };
};
