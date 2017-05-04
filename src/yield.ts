import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import * as b from 'babylon';
import generate from 'babel-generator';
import * as h from './helpers';

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
    const lastLine = path.node.body.pop();
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

const callExpression: VisitNode<t.CallExpression> =
  function (path: NodePath<t.CallExpression>): void {
    if (h.isNativeFunction(path.node.callee)) return;
    if (t.isYieldExpression(path.parent)) return;

    const yieldExpr = t.yieldExpression(path.node, true);
    path.replaceWith(yieldExpr);
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

  // Set isGen property on the function.
  const assign = t.assignmentExpression('=',
    t.memberExpression(path.node.id, t.identifier('$isGen')),
    t.booleanLiteral(true))
  path.insertAfter(t.expressionStatement(assign))
};

const funce: VisitNode<t.FunctionExpression> =
  function (path: NodePath<t.FunctionExpression>): void {
    // Set isGen property on the function.
    const decl = path.parent;
    if (!t.isVariableDeclarator(decl)) {
      throw new Error(`Parent of function expression was ${decl.type}`)
    } else {
      path.node.body.body.unshift(ifYield);
      path.node.generator = true;

      // Decl will always be a variable so casting it to expression is fine.
      const assign = t.assignmentExpression('=',
        t.memberExpression(<t.Expression>decl.id, t.identifier('$isGen')),
        t.booleanLiteral(true))
      path.getStatementParent().insertAfter(t.expressionStatement(assign))
    }
}

const yieldVisitor: Visitor = {
  Program: program,
  FunctionDeclaration: funcd,
  FunctionExpression: funce,
  CallExpression: callExpression,
  "Loop": loop,
}

module.exports = function() {
  return { visitor: yieldVisitor };
};
