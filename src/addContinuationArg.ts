/**
 * Plugin to prepend continuation argument to function params
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {FunctionNode, ReturnStatement} from './helpers';

const func : VisitNode<FunctionNode> =
  function (path: NodePath<FunctionNode>): void {
    const k = path.scope.generateUidIdentifier('k');
    path.node.params = [k, ...path.node.params];
  };

const returnVisit : VisitNode<ReturnStatement> =
  function (path: NodePath<ReturnStatement>): void {
    const functionParent =
      <NodePath<FunctionNode>>path.findParent(x => x.isFunction());
    path.node.kArg = <t.Expression>functionParent.node.params[0];

    if (path.node.argument === null) {
      path.node.argument = t.unaryExpression('void', t.numericLiteral(0));
    }
  };

const addKArgVisitor : Visitor = {
  FunctionDeclaration: func,
  FunctionExpression: func,
  ReturnStatement: returnVisit
}

module.exports = function() {
  return { visitor: addKArgVisitor };
};
