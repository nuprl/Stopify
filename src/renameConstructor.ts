import * as t from 'babel-types';
import { NodePath } from 'babel-traverse'

const visitor = {
  Identifier(path: NodePath<t.Identifier>) {
    if (t.isMemberExpression(path.parent) &&  path.node.name === 'constructor') {
      path.node.name = '__constructor'
    }
  }
}

module.exports = function () {
  return { visitor }
}
