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
    t.expressionStatement(t.callExpression(t.memberExpression(
      t.identifier('Object'), t.identifier('defineProperty')),
      [p, t.stringLiteral('length'), t.objectExpression(
        [t.objectProperty(t.identifier('configurable'), t.booleanLiteral(true)),
          t.objectProperty(t.identifier('value'), 
            t.binaryExpression('-', t.memberExpression(p, t.identifier('length')),
              t.numericLiteral(2)))])])),
    t.returnStatement(p)
  ])
)

const cpsRuntime : Visitor = {
  Program: {
    exit(path: NodePath<t.Program>): void {
      path.node.body.unshift(markFunc);
    }
  }
};

module.exports = function () {
  return { visitor: cpsRuntime };
}
