// Post-CPS transformation to apply top-level continuation and eval program.

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as b from 'babylon';
import * as t from 'babel-types';

const program : VisitNode<t.Program> = function (path: NodePath<t.Program>): void {
  const { body } = path.node;

  const onDone = t.identifier('onDone');
  const onError = t.identifier('onError');
  const kont = t.functionExpression(undefined, [onDone, onError], t.blockStatement(body));
  const kontCall = t.callExpression(kont, [onDone, onError])

  path.node.body = [t.expressionStatement(kontCall)];
};

const kApplyVisitor : Visitor = {
  Program: program
};

module.exports = function() {
  return { visitor: kApplyVisitor };
};
