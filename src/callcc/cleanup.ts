/**
 * This plugin cleans up JavaScript code to conform to ES5 strict mode.
 * It does the following:
 * 
 * 1. Eliminate arguments.callee
 * 
 */
import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';

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
      const fName = (<t.Function>path.getFunctionParent().node).id;
      if (!fName) {
        throw new Error(`Expected function name`);
      }
      path.replaceWith(fName);
    }
  }
};

export default function () {
  return { visitor: visitor };
}
