// Use this file to document all the constraints on JS--.
import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';

const verifyVisitor = {
  // Only while loops.
  Loop: function (path: NodePath<t.Loop>): void {
    if (t.isWhileStatement(path.node) === false) {
      throw new Error(`Resulting code has ${path.node.type}`);
    }
  },

  // No switch-case constructs.
  ['SwitchStatement|SwitchCase']: function (path: NodePath<t.SwitchStatement|t.SwitchCase>): void {
    throw new Error(`Resulting code has ${path.node.type}`);
  },

  // No logical expressions.
  LogicalExpression: function (path: NodePath<t.LogicalExpression>): void {
    throw new Error(`Resulting code has ${path.node.type}`);
  },
}

module.exports = function() {
  return { visitor: verifyVisitor };
};
