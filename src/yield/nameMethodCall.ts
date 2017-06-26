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

const visitor = {
  MemberExpression: memExpr
}

module.exports = function () {
  return { visitor };
}
