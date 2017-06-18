/**
 * Plugin to prepend continuation argument to function params
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {
  FunctionNode, KArg, kArg, Transformed, transformed
} from '../common/helpers';

const func : VisitNode<FunctionNode> =
  function (path: NodePath<Transformed<t.FunctionExpression>>): void {
    if (path.node.isTransformed) {
      path.skip();
      return;
    }
    const k = path.scope.generateUidIdentifier('k');
    const ek = path.scope.generateUidIdentifier('ek');
    path.node.params = [k, ek, ...path.node.params];
    transformed(path.node);
  };

const returnVisit : VisitNode<Transformed<KArg<t.ReturnStatement>>> =
  function (path: NodePath<Transformed<KArg<t.ReturnStatement>>>): void {
    if (path.node.isTransformed) {
      return;
    }
    const functionParent =
      <NodePath<FunctionNode>>path.findParent(x => x.isFunction());
    transformed(kArg(path.node, <t.Identifier>functionParent.node.params[0]));

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
