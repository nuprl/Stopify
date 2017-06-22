import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { parseExpression } from 'babylon';
import {
  Transformed, transformed, Tag, OptimizeMark, letExpression
} from '../common/helpers'

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

    let callee = path.node.callee;
    if (exp.OptimizeMark === 'Untransformed') {
      return;
    }
    else if (exp.OptimizeMark === 'Transformed') {
      path.replaceWith(t.yieldExpression(exp, true))
    }
    else {
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
      // If the callee is a functionExpression, name it.
      else if(t.isFunctionExpression(path.node.callee)) {
        const name = path.scope.generateUidIdentifier('fexpr');
        const stmtParent = path.findParent(p => t.isStatement(p))
        stmtParent.insertBefore(letExpression(
          name, path.node.callee
        ))
        path.get('callee').replaceWith(name)
        callee = name
      }
      const cond = t.conditionalExpression(
        t.memberExpression(callee, t.identifier('$isTransformed')),
        t.yieldExpression(path.node, true),
        path.node)
      path.replaceWith(cond);
    }
  };

const loop: VisitNode<t.Loop> = function (path: NodePath<t.Loop>): void {
  if (t.isBlockStatement(path.node.body)) {
    path.node.body.body.unshift(ifYield);
  } else {
    throw new Error('Body of loop is not a block statement')
  }
}

const funce: VisitNode<t.FunctionExpression|t.FunctionDeclaration> =
  function (path: NodePath<t.FunctionExpression|t.FunctionDeclaration>): void {
    // Set isGen property on the function.
    path.node.body.body.unshift(ifYield);
    path.node.generator = true;
    transformed(path.node)
};

const yieldVisitor: Visitor = {
  FunctionDeclaration: funce,
  FunctionExpression: funce,
  CallExpression: callExpression,
  "Loop": loop,
  Program: program,
}

module.exports = function() {
  return { visitor: yieldVisitor };
};
