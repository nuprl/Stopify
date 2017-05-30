import { NodePath, VisitNode, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as h from './helpers';

const markFuncName = t.identifier('$mark_func')

const p = t.identifier('f')
const tr = t.identifier('$isTransformed')

const markFunc = t.functionDeclaration(
  markFuncName,
  [p],
  t.blockStatement([
    t.expressionStatement(t.assignmentExpression('=',
      t.memberExpression(p, tr),
      t.booleanLiteral(true))),
    t.expressionStatement(t.assignmentExpression('=',
      t.memberExpression(p, t.identifier('call')),
      h.directApply(t.callExpression(t.memberExpression(
        t.memberExpression(p, t.identifier('call')),
        t.identifier('bind')), [p])))),
    t.expressionStatement(t.assignmentExpression('=',
      t.memberExpression(t.memberExpression(p, t.identifier('call')), tr),
      t.booleanLiteral(true))),
    t.expressionStatement(t.assignmentExpression('=',
      t.memberExpression(p, t.identifier('apply')),
      h.directApply(t.callExpression(t.memberExpression(
        t.memberExpression(p, t.identifier('apply')),
        t.identifier('bind')), [p])))),
    t.expressionStatement(t.assignmentExpression('=',
      t.memberExpression(t.memberExpression(p, t.identifier('apply')), tr),
      t.booleanLiteral(true))),
    t.returnStatement(p)
  ])
)

const program : VisitNode<t.Program> = {
  exit(path: NodePath<t.Program>): void {
    path.node.body.unshift(markFunc);
  },
};

const funcd: VisitNode<h.Transformed<t.FunctionDeclaration>> =
  function (path: NodePath<h.Transformed<t.FunctionDeclaration>>) {
    if(path.node.isTransformed) {
      const markCall = h.directApply(t.callExpression(markFuncName, [path.node.id]));
      path.insertAfter(markCall)
    }
}


const funce: VisitNode<h.Transformed<t.FunctionExpression>> =
  function (path: NodePath<h.Transformed<t.FunctionExpression>>) {
    if(path.node.isTransformed) {
      path.node.isTransformed = false;
      path.replaceWith(h.directApply(t.callExpression(markFuncName, [path.node])));
    }
  }

const visitor = {
  Program: program,
  FunctionDeclaration: funcd,
  FunctionExpression: funce,
}

module.exports = function () {
  return { visitor }
}
