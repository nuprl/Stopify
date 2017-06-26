import * as t from 'babel-types';
import { NodePath } from 'babel-traverse'

function memExpr(path: NodePath<t.MemberExpression>) {
  if(t.isIdentifier(path.node.property) &&
    path.node.property.name === 'constructor') {
    path.node.property.name = '__constructor'
  }
}

const visitor = {
  MemberExpression: memExpr
}

module.exports = function () {
  return { visitor }
}
