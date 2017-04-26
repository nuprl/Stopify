// Use this file to document all the constraints on JS--.
import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';

const verifyVisitor = {
  CallExpression: function (path: NodePath<t.CallExpression>): void {
    if(t.isIdentifier(path.node.callee) && path.node.callee.name === 'eval') {
      throw new Error('Program contains eval')
    }
  }
}

module.exports = function() {
  return { visitor: verifyVisitor };
};
