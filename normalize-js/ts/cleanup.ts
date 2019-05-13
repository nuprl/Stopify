/**
 * This plugin cleans up JavaScript code to conform to ES5 strict mode.
 * It does the following:
 *
 * 1. Eliminate arguments.callee
 *
 */
import { NodePath } from 'babel-traverse';
import * as t from 'babel-types';
import { fresh } from '@stopify/hygiene';

const visitor = {

  MemberExpression(path: NodePath<t.MemberExpression>) {
    const object = path.node.object;
    const property = path.node.property;
    // Look for arguments['callee'] or arguments.callee
    if (object.type === 'Identifier' && object.name === 'arguments' &&
        ((path.node.computed &&
          property.type === 'StringLiteral' &&
          property.value === 'callee') ||
         (!path.node.computed &&
          property.type === 'Identifier' &&
          property.name === 'callee'))) {
      const functionParent = path.getFunctionParent();
      let id;
      if (!(<t.Function>functionParent.node).id) {
        id = fresh('funExpr');
        (<t.Function>functionParent.node).id = id;
      } else {
        id = (<t.Function>functionParent.node).id;
      }
      path.replaceWith(id);
    }
  }
};

export default function () {
  return { visitor: visitor };
}
