// Use this file to document all the constraints on JS--.
import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';

const verifyVisitor = {
  // Programs should consist of a single function expression after CPS.
  Program: function (path: NodePath<t.Program>): void {
    const { body } = path.node;
    const [head, ...tail] = body;
    if (body.length !== 1 && t.isExpressionStatement(head) &&
      t.isFunctionExpression(head.expression)) {
      throw new Error(`Resulting CPS code not a function expression, but
            ${path.node.type}`);
    }
  }
}

module.exports = function() {
  return { visitor: verifyVisitor };
};
