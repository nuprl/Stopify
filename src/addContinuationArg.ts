/**
 * Plugin to prepend continuation argument to function params
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {FunctionNode, KArg, kArg} from './helpers';

const func : VisitNode<FunctionNode> =
  function (path: NodePath<FunctionNode>): void {
    const k = path.scope.generateUidIdentifier('k');
    const ek = path.scope.generateUidIdentifier('ek');
    path.node.params = [k, ek, ...path.node.params];
  };

const returnVisit : VisitNode<KArg<t.ReturnStatement>> =
  function (path: NodePath<KArg<t.ReturnStatement>>): void {
    const functionParent =
      <NodePath<FunctionNode>>path.findParent(x => x.isFunction());
    kArg(path.node, <t.Identifier>functionParent.node.params[0]);

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
