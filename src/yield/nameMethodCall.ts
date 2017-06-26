import * as t from 'babel-types';
import { NodePath } from 'babel-traverse';
import * as h from '../common/helpers';

function memExpr(path: NodePath<t.MemberExpression>) {
  const { object, property } = path.node;
  if(t.isCallExpression(object) || t.isNewExpression(object)) {
    // Insert the name of the method call.
    const name = path.scope.generateUidIdentifier('mcall');
    path.getStatementParent().insertBefore(h.letExpression(
      name, t.unaryExpression('void', t.numericLiteral(0))))

    const cassign = t.logicalExpression(
      '||', name, t.assignmentExpression('=', name, object))

    path.replaceWith(t.memberExpression(cassign, property))
  }
}

function callExpr(path: NodePath<t.CallExpression>) {
  const { callee, arguments:args } = path.node;
  if(t.isCallExpression(callee) || t.isNewExpression(callee)) {
    // Insert the name of the method call.
    const name = path.scope.generateUidIdentifier('mcall');
    path.getStatementParent().insertBefore(h.letExpression(
      name, t.unaryExpression('void', t.numericLiteral(0))))

    const cassign = t.logicalExpression(
      '||', name, t.assignmentExpression('=', name, callee))

    path.replaceWith(t.callExpression(cassign, args))
  }
}

const visitor = {
  MemberExpression: memExpr,
  CallExpression: callExpr
}

module.exports = function () {
  return { visitor };
}
