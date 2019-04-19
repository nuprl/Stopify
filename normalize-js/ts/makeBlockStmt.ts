/**
 * Transforms loop bodies and conditional branches to block statements.
 */
import { VisitNode, Visitor } from '@babel/traverse';
import * as t from '@babel/types';

// Consequents and alternatives in if statements must always be blocked,
// otherwise variable declaration get pulled outside the branch.
const ifStatement : VisitNode<{}, t.IfStatement> = function(path) {
  const { consequent, alternate } = path.node;

  if (t.isBlockStatement(consequent) === false) {
    path.node.consequent = t.blockStatement([consequent]);
  }

  if (alternate !== null && t.isBlockStatement(alternate) === false) {
    path.node.alternate = t.blockStatement([alternate]);
  }
};

const loop: VisitNode<{}, t.Loop> = function(path) {
  if(t.isBlockStatement(path.node.body)) { return; }
  path.node.body = t.blockStatement([path.node.body]);
};

export const visitor : Visitor = {
  IfStatement: ifStatement,
  Loop: loop,
};
