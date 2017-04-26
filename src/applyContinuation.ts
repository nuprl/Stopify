// Post-CPS transformation to apply top-level continuation and eval program.

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as b from 'babylon';
import * as t from 'babel-types';

interface CallExpression extends t.CallExpression {
  dontTransform: boolean;
}

const program : VisitNode<t.Program> = function (path: NodePath<t.Program>): void {
  const { body } = path.node;

  const k = path.scope.generateUidIdentifier('k');
  const cpsFunction = (<t.ExpressionStatement>body[0]).expression;
  const kArgs = <any>[k];
  const onDoneCall =
    <CallExpression>t.callExpression(t.identifier('onDone'), [k])
  onDoneCall.dontTransform = true;
  const kont =
    t.functionExpression(null, kArgs, t.blockStatement([
      t.returnStatement(onDoneCall)]))
  const cpsApply = t.callExpression(cpsFunction, [kont]);

  path.node.body = [t.expressionStatement(cpsApply)];
};

const kApplyVisitor : Visitor = {
  Program: program
};

module.exports = function() {
  return { visitor: kApplyVisitor };
};
