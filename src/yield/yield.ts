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
      let callee = path.node.callee;
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

const funcd: VisitNode<t.FunctionDeclaration> =
  function (path: NodePath<t.FunctionDeclaration>): void {
    // Add a dummy yield at the top of the function to force it to pause.
    path.node.body.body.unshift(ifYield);
    path.node.generator = true;
    transformed(path.node)
};

const funce: VisitNode<t.FunctionExpression> =
  function (path: NodePath<t.FunctionExpression>): void {
    // Set isGen property on the function.
    const decl = path.parent;
    if (!t.isVariableDeclarator(decl)) {
      throw new Error(
        `Parent of function expression was ${decl.type} on line ${decl.loc.start.line}`)
    } else {
      path.node.body.body.unshift(ifYield);
      path.node.generator = true;
      transformed(path.node)
    }
};

const yieldVisitor: Visitor = {
  FunctionDeclaration: funcd,
  FunctionExpression: funce,
  CallExpression: callExpression,
  "Loop": loop,
  Program: program,
}

module.exports = function() {
  return { visitor: yieldVisitor };
};
