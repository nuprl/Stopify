/**
 * Module to desugar labeled statements into try catches.
 *
 * A label statement turns into a try catch block that catches a
 * corresponding named block on a break.
 *
 */

import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';
import {While, Break, breakLbl, continueLbl} from '../common/helpers';

// Object containing the visitor functions
const labelVisitor : Visitor = {
  ContinueStatement: function (path: NodePath<t.ContinueStatement>): void {
    const loopParent : NodePath<While<t.Node>> =
      path.findParent(p => p.isWhileStatement());
    const continueLabel = loopParent.node.continue_label;

    const breakStatement = t.breakStatement(continueLabel);
    path.replaceWith(breakStatement);
  },

  BreakStatement: function (path: NodePath<Break<t.BreakStatement>>): void {
    const label = path.node.label;
    if (label === null) {
      const labeledParent : NodePath<Break<t.Node>> =
        path.findParent(p => p.isWhileStatement() || p.isSwitchStatement());

      if (labeledParent === null) {
        throw new Error( `Parent of ${path.node.type} wasn't a labeledStatement`);
      }

      path.node.label = <t.Identifier>labeledParent.node.break_label;
    }
  },

  SwitchStatement: function (path: NodePath<Break<t.SwitchStatement>>): void {
    if (t.isLabeledStatement(path.parent)) return;

    const breakLabel = path.scope.generateUidIdentifier('switch');
    path.node = breakLbl(path.node, breakLabel);
    const labeledStatement = t.labeledStatement(breakLabel, path.node);
    path.replaceWith(labeledStatement);
  }
}

module.exports = function() {
  return { visitor: labelVisitor };
};
