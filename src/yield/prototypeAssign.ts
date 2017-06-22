import * as t from 'babel-types'
import { NodePath } from 'babel-traverse'
/*
 * Turn all instances of foo.prototype = val into
 * Object.assign(foo.prototype, val)
 */

const visitor = {
  AssignmentExpression(path: NodePath<t.AssignmentExpression>) {
    const { right, left, operator } = path.node
    if (t.isMemberExpression(left)) {
      if (t.isIdentifier(left.property) && left.property.name === 'prototype' ||
          t.isStringLiteral(left.property) &&
            left.property.value === 'prototype') {
        if(operator !== '=') {
          throw new Error(`Assignment to prototype using ${operator}`)
        }
        path.replaceWith(t.callExpression(
          t.memberExpression(t.identifier('Object'), t.identifier('assign')),
          [left, right]
        ))
      }
    }
  }
}

module.exports = function() {
  return { visitor }
}
