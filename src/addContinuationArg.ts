/**
 * Plugin to prepend continuation argument to function params
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';

type Function = t.FunctionDeclaration|t.FunctionExpression;
interface ReturnStatement extends t.ReturnStatement {
  kArg: t.Node;
};

const func : VisitNode<Function> = function (path: NodePath<Function>): void {
  const k = path.scope.generateUidIdentifier('k');
  path.node.params = <t.Pattern[]>[k, ...path.node.params];
};

const returnVisit : VisitNode<ReturnStatement> = function (path: NodePath<ReturnStatement>): void {
  const functionParent = <NodePath<Function>>path.findParent(x => x.isFunction());
  path.node.kArg = functionParent.node.params[0];

  if (path.node.argument === null) {
    path.node.argument = t.unaryExpression('void', t.numericLiteral(0));
  }
}

const addKArgVisitor : Visitor = {
  FunctionDeclaration: func,
  FunctionExpression: func,
  ReturnStatement: returnVisit
}

module.exports = function() {
  return { visitor: addKArgVisitor };
};
