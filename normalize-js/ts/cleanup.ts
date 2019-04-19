/**
 * This plugin cleans up JavaScript code to conform to ES5 strict mode.
 * It does the following:
 *
 * 1. Eliminate arguments.callee
 *
 */
import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as fastFreshId from './fastFreshId';

export const visitor = {

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
      const parent = path.getFunctionParent().node;
      if (t.isFunctionDeclaration(parent) || t.isFunctionExpression(parent)) {
        if (parent.id === null) {
          parent.id = fastFreshId.fresh('funExpr');
        }
        path.replaceWith(parent.id!);
      }
      else {
        throw new Error(`found arguments.callee in ${parent.type}`);
      }
    }
  }
};
