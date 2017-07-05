import * as t from 'babel-types';
import { NodePath } from 'babel-traverse';
import * as h from '../common/helpers';

const callExpr = {
  enter(path: NodePath<t.CallExpression>) {
    const { callee, arguments:args }  = path.node
    if (t.isCallExpression(callee)) {
      const name = path.scope.generateUidIdentifier('mcall')
      path.getStatementParent().insertBefore(h.letExpression(
        name, t.unaryExpression('void', t.numericLiteral(0))))

      const assign = t.assignmentExpression('=', name, callee)
      const call = t.callExpression(name, args)
      path.replaceWith(t.sequenceExpression([assign, call]))
    }
    else if(t.isMemberExpression(callee) && t.isCallExpression(callee.object)) {
      const name = path.scope.generateUidIdentifier('mcall')
      path.getStatementParent().insertBefore(h.letExpression(
        name, t.unaryExpression('void', t.numericLiteral(0))))
      const assign = t.assignmentExpression('=', name, callee.object)
      const call = t.callExpression(
        t.memberExpression(name, callee.property), args)
      path.replaceWith(t.sequenceExpression([assign, call]))
    }
  }
}

const visitor = {
  CallExpression: callExpr
}

module.exports = function () {
  return { visitor }
}
